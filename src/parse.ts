import { defaults, grammar, grammar_start, is_term, regexes, Rule, Symbol } from "./gen/grammar";
import HashSet from "./HashSet";

type RecognizerItem = {
  rule: Rule;
  dot: number;
  from: number;
  concrete: boolean;
  before: HashSet<Symbol>;
}

type Item = {
  rule: Rule;
  dot: number;
  from: number;
  concrete: boolean;
  forest: ParseForest;
}

function item_hash(item: Item | RecognizerItem): string{
  let ret = "";
  ret += Symbol[item.rule.lhs];
  ret += ","
  for (let i = 0; i < item.rule.rhs.length; i++) {
    if (item.dot === i) {
      ret += ".";
    }
    ret += Symbol[item.rule.rhs[i]];
    ret += ",";
  }
  if (item.dot === item.rule.rhs.length) {
    ret += "."
  }
  ret += item.from.toString()
  if (item.concrete) {
    ret += "!";
  }
  return ret;
}


function recognizer_item_str(item: RecognizerItem): string{
  let ret = "";
  ret += Symbol[item.rule.lhs];
  ret += " -> "
  for (let i = 0; i < item.rule.rhs.length; i++) {
    if (item.dot === i) {
      ret += ". ";
    }
    ret += Symbol[item.rule.rhs[i]];
    ret += " ";
  }
  if (item.dot === item.rule.rhs.length) {
    ret += ". "
  }
  ret += "(" + item.from.toString() + ")";
  if (item.concrete) {
    ret += "!";
  }
  ret += '[';
  for (const symbol of item.before.to_array()) {
    ret += Symbol[symbol];
    ret += ' ';
  }
  ret += ']';
  return ret;
}

function item_str(item: Item | RecognizerItem): string{
  let ret = "";
  ret += Symbol[item.rule.lhs];
  ret += " -> "
  for (let i = 0; i < item.rule.rhs.length; i++) {
    if (item.dot === i) {
      ret += ". ";
    }
    ret += Symbol[item.rule.rhs[i]];
    ret += " ";
  }
  if (item.dot === item.rule.rhs.length) {
    ret += ". "
  }
  ret += "(" + item.from.toString() + ")";
  if (item.concrete) {
    ret += "!";
  }
  return ret;
}


//End Generated

class ParseForest {
  children: Map<ParseForest, number>[] = [];
  data:Symbol;
  leaf?: ParseTree;
  start:number;
  flatten_memo: ParseTree[] = [];
  id: number;
  static last_id = 0;
  constructor(data: Symbol, start: number, rhs?: Symbol[], leaf?: ParseTree){
    this.data = data;
    this.start = start;
    if (rhs) {
      for (const symbol of rhs) {
        this.children.push(new Map([[new ParseForest(symbol,-1,undefined,{
          data: symbol,
          children: [],
          num_imagined: 1,
          start: -1,
          end: -1,
        }),1]]));
      }
    }
    this.leaf = leaf;
    this.id = ParseForest.last_id++;
  }
  add_child(index: number, child: ParseForest) {
    let proper_start = this.start;

    //if (child.start !== proper_start) return;
    //if (this.children[index+1] && this.children[index+1][0]) {
      //const next_child = this.children[index+1][0]
      //const proper_end = this.children[index+1][0].start;
      //if (child.end !== proper_end) return;
    //}

    let amount = this.children[index].get(child) ?? 0;
    this.children[index].set(child,amount + 1);
    //if (this.children.length - 1 == index && child.end > child.start) {
      //this.end = child.end;
    //}
  }
  to_string() {
    let ret = "";
    function to_string_helper(indent: string, forest: ParseForest, depth: number) {
      if (depth === 0) return;
      ret += indent + "(" + forest.start + ")";
      ret += Symbol[forest.data];
      let i = 0;
      for (const possibilties of forest.children) {
        ret+= "\n";
        ret += indent + i.toString() + ":"
        i++;
        for (const child of possibilties) {
          ret+= "\n";
          to_string_helper(indent + "\t", child[0], depth-1);
        }
      }
    }
    to_string_helper("",this,5);
    return ret;
  }

  flatten(end: number, indent: string = "", edge_context: Map<ParseForest,Map<ParseForest, number>> = new Map()): ParseTree[] {
    if (DEBUG)
    console.log(indent + "flattening: " + Symbol[this.data] + "." + this.id + (this.start === -1 ? "?" : ""));
    if (this.flatten_memo.length !== 0) {
      if (DEBUG){
        for (const tree of this.flatten_memo) {
          console.log(ptree_str(tree, indent+"\t"));
        }
      }
      return this.flatten_memo;
    }
    if (this.leaf){
      return [this.leaf];
    }
    let child_forests: ParseTree[][] = [];
    for (let i = 0; i < this.children.length; i++){
      if (DEBUG)
        console.log(indent + "\t" + i.toString());
      child_forests[i] = [];
      for (const child_forest of this.children[i]) {
        if (edge_context.get(this)?.get(child_forest[0]) !== child_forest[1]) {
          let map = edge_context.get(this);
          if (!map) {
            let adding = new Map();
            edge_context.set(this, adding);
            map = adding;
          }
          map.set(child_forest[0],(map.get(child_forest[0]) ?? 0) + 1);
          child_forests[i].push(...child_forest[0].flatten(end, indent + "\t", edge_context));
          map.set(child_forest[0],(map.get(child_forest[0]) ?? 0) - 1);
        }
        else if (DEBUG){
          console.log(indent + "\tskipped:" + Symbol[child_forest[0].data] + "." + child_forest[0].id);
        }
      }
    }
    if (!(end === -1)) {
      let full_ret = child_forests.reduce((accumulator, f)=>accumulator.concat(f.filter((t)=>{return !(t.children.length === 0) && t.start === 0 && t.end === end})),[]);
      if (full_ret.length !== 0) {
        return full_ret;
      }
    }
    let ret: ParseTree[] = [];
    let next_ret: ParseTree[] = [];
    let ret_root = {children: [], data: this.data, num_imagined: 0, start: this.start, end: this.start};
    ret.push(ret_root);
    for (let i = 0; i < this.children.length; i++){
      for (const ret_tree of ret){
        for (const tree of child_forests[i]){
          if (tree.start === ret_tree.end || tree.start === -1){
            let next_end = (tree.start === -1)? ret_tree.end : tree.end;
            next_ret.push({
              children: ret_tree.children.concat([tree]), 
              num_imagined: ret_tree.num_imagined+tree.num_imagined, 
              data: this.data, 
              start: this.start, 
              end: next_end
            });
          }
        }
      }
      ret = next_ret.filter((t)=>t.children.length === i+1);
    }
    function has_conversion(t: ParseTree, s: Symbol) : boolean{
      let scc = undefined; //single concrete child
      for (const child of t.children) {
        if (child.start !== -1) {
          if (scc !== undefined) { //not a conversion
            return false;
          }
          scc = child;
        }
      }
      if (scc === undefined) {
        return false;
      }
      if (scc.data === s) {
        return true;
      }
      return has_conversion(scc,s);
    }

    let min_imagined: {[key: number]: number} = {};
    for (const tree of ret) {
      const current = min_imagined[tree.end];
      if ((current === undefined) || current > tree.num_imagined) {
        min_imagined[tree.end] = tree.num_imagined;
      }
    }

    function filter(t: ParseTree) {
      if (t.end === t.start) return false;
      if (has_conversion(t,t.data)) return false;
      if (t.num_imagined > min_imagined[t.end]) return false;

      //TODO maybe restrict parses to left most here?
      return true;
    }


    ret = ret.filter(filter);

    if (DEBUG)
    for (const tree of ret) {
      console.log(ptree_str(tree, indent + "\t"));
      console.log(tree.start, tree.end);
    }
    
    this.flatten_memo = ret.map((x)=>x);
    return ret;
  }
}

export const defaultParseTree = {
  children: [],
  data: Symbol.S,
  num_imagined: 0,
  start: 0,
  end: 1,
};

export type RenderInfo = {
  reactiveSet: (to: ParseTree)=>void;
  last_selected: number;
  cursor_index: number;
  parent?: ParseTree;
}

export type ParseTree = {
  children: ParseTree[];
  data: Symbol;
  token?: string;
  num_imagined: number;
  start: number;
  end: number;
  render_info?: RenderInfo;
}

export function ptree_less_shallow(tree: ParseTree) {
  return {
    children: tree.children.map((x)=>x),
    data:tree.data,
    token:tree.token,
    num_imagined: tree.num_imagined,
    start: tree.start,
    end: tree.end,
    render_info: tree.render_info,
  }
}

export function ptree_shallow(tree: ParseTree) {
  return {
    children:tree.children,
    data:tree.data,
    token:tree.token,
    num_imagined: tree.num_imagined,
    start: tree.start,
    end: tree.end,
    render_info: tree.render_info,
  }
}

function ptree_eq(t1: ParseTree, t2: ParseTree) {
  if (t1 === t2) {
    return true;
  }

  if (t1.children.length !== t2.children.length){
    return false;
  }

  if (t1.data !== t2.data) {
    return false;
  }

  for (let i = 0; i < t1.children.length; i++){
    if (!ptree_eq(t1.children[i],t2.children[i])){
      return false;
    }
  }
  return true;
}

export function ptree_str(t: ParseTree, indent = ""){
  let ret = "";
  function helper(t: ParseTree, ind: string){
    ret += ind;
    ret += Symbol[t.data];
    if (t.start === -1) {
      ret += "?";
    }
    else if (!is_term(t.data)) {
      ret += "(" + t.start + ", " + t.end + ")";
    }
    ret += "\n";
    for (const child of t.children) {
      helper(child,ind+"\t");
    }
  }
  helper(t,indent);
  return ret;
}

function add_item<T>(state_set: HashSet<T>, unprocessed: (T)[], adding: T) {
  const was_there = state_set.has(adding);
  if (was_there !== undefined) {
    return was_there;
  }
  unprocessed.push(adding);
  state_set.add(adding);
  return undefined;
}

type StateSet = {
  items: HashSet<Item>;
  from: number;
};

const DEBUG = true;

export function concreteify(tree: ParseTree, start=0): number{
  tree.start = start;
  if (tree.children.length === 0) {
    if (!tree.token && is_term(tree.data) && defaults[tree.data].length !== 0) {
      tree.token = defaults[tree.data];
    }
    tree.end = start+1;
    return start + 1;
  }
  for (let child of tree.children) {
    start = concreteify(child, start);
  }
  tree.end = start;
  return start;
}

export function retokenize(to: ParseTree, adding: string, at: number) {
  if (!to.render_info) {
    return [];
  }
  if (!to.render_info.parent) {
    return [];
  }
  let siblings = to.render_info.parent.children;
  
  let index = siblings.indexOf(to);
  if (at === 0) {
    if (is_term(to.data) && index !== 0 && is_term(siblings[index-1].data)) {
      //both terms
      siblings.splice(index-1,2,...tokenize(
        adding
        .concat(siblings[index].token? siblings[index].token! : "")
        .concat(siblings[index-1].token? siblings[index-1].token! : "")));
        return siblings;
    }
    if (is_term(to.data)) {
      siblings.splice(index,1,...tokenize(adding.concat(siblings[index].token? siblings[index].token! : "")));
      return siblings;
    }
    console.log("INDEX",index);
    if (index !== 0 && is_term(siblings[index-1].data)) {
      siblings.splice(index-1,1,...tokenize(adding.concat(siblings[index-1].token? siblings[index-1].token! : "")));
      return siblings;
    }
  }
  siblings.splice(index,0,...tokenize(adding));

  return siblings;
}

function decompose(tree: ParseTree, depth: number, exception: ParseTree): [ParseTree[], ParseTree[], boolean] {
  let before: ParseTree[] = [];
  let after: ParseTree[] = [];
  let seen_exeption = false;
  let should_break = true; 
  function recurse(tree_inner: ParseTree, depth: number) {
    if (tree_inner === exception) {
      seen_exeption = true;
      return;
    }
    if (depth < 0 || tree_inner.children.length === 0) {
      if (tree_inner.children.length !== 0) {
        should_break = false;
      }
      if (seen_exeption) {
        after.push(tree_inner)
      }
      else {
        before.push(tree_inner)
      }
      return;
    }
    for (let child of tree_inner.children) {
      recurse(child, depth - 1);
    }
  }
  recurse(tree, depth);
  return [before, after, should_break];
}

function recognize_append(oldChart: HashSet<RecognizerItem>[], appending: ParseTree[]) {
  if (appending.length === 0) {
    return oldChart;
  }
  if (oldChart.length === 0) {
    oldChart.push(new HashSet<RecognizerItem>(item_hash));
    grammar[0].forEach((rule)=>{
      oldChart[0].add({rule: rule, dot: 0, from: 0, concrete: false, before: new HashSet((x)=>Symbol[x])});
    });
  }
  let orig_len = oldChart.length;
  const len = appending.length;
  for (let i = 0; i < len; i++) {
    oldChart.push(new HashSet<RecognizerItem>(item_hash));
  }
  for (let i = 0; i <= len; i++) {
    const index = orig_len + i - 1;
    let unprocessed: RecognizerItem[] = oldChart[index].to_array();
    while(unprocessed.length > 0){
      const item: RecognizerItem = unprocessed.pop() as RecognizerItem;
      const next_symbol = item.rule.rhs[item.dot];
      if (item.dot != item.rule.rhs.length) {
        let was_there = add_item(oldChart[index], unprocessed, {
          rule: item.rule, 
          dot: item.dot+1, 
          from: item.from,
          concrete: item.concrete,
          before: (index === 0)? item.before.copy().add(item.rule.rhs[item.dot]) : item.before,
        });
        if (index === 0 && was_there) {
          was_there.before = was_there.before.concat(item.before);
        }
      }
      if (i < len && next_symbol === appending[i].data){ //scan
        let adding = {
          rule: item.rule,
          dot: item.dot+1,
          from: item.from,
          // nodes contining stream token are concrete
          concrete: true,
          before: item.before,
        }
        let was_there = oldChart[index+1].has(adding);
        oldChart[index+1].add(adding);
        if (was_there) {
          was_there.before = was_there.before.concat(item.before);
        }
      }
      if (next_symbol && !is_term(next_symbol)) { //predict
        for (const rule of grammar[next_symbol - grammar_start]) {
          let was_there = add_item(oldChart[index], unprocessed, {
            rule: rule, 
            dot: 0, 
            from: index,
            // Nodes aren't concrete if they don't have concrete children -- and when we add the new items, they don't
            concrete: false,
            before: item.before,
          });
          if (was_there) {
            was_there.before = was_there.before.concat(item.before);
          }
        }
      }
      else if (item.concrete && item.dot === item.rule.rhs.length) { //complete
        for (const checking of oldChart[item.from].to_array()) {
          if (checking.rule.rhs[checking.dot] === item.rule.lhs){
            let was_there = add_item(oldChart[index], unprocessed, {
              rule: checking.rule, 
              dot: checking.dot + 1, 
              from: checking.from,
              // Concreteness propagates up the tree
              concrete: true, 
              before: item.before,
            });
            if (was_there) {
              was_there.before = was_there.before.concat(item.before);
            }
          }
        }
        continue;
      }
    }
  }
  for (let i = 0; i < oldChart.length; i++) {
    if(DEBUG){
      console.log("==="+i+"===");
      for (const item of oldChart[i].to_array())
        console.log(recognizer_item_str(item));
    }
  }
  return oldChart;
}

//check if a inserting parse can be continued by @check_against
function check(inserting: HashSet<RecognizerItem>[], existing: HashSet<RecognizerItem>[]) {
  if (inserting.length === 0 || existing.length === 0) {
    return true;
  }
  let replace: {[x: string]: HashSet<Symbol>} = {};
  for (const item of inserting[inserting.length-1].to_array()) {
    if (!item.concrete) {
      continue;
    }
    let symbol = item.rule.rhs[item.dot-1];
    let there = replace[Symbol[symbol]]
    if (there === undefined) {
      replace[Symbol[symbol]] = item.before;
    }
    else {
      replace[Symbol[symbol]].copy().concat(item.before);
    }
  }
  let to_remove: RecognizerItem[] = [];
  for (let item of existing[existing.length-1].to_array()) {
    let new_before = new HashSet<Symbol>((x)=>Symbol[x]);
    let seen = false;
    for (const before of item.before.to_array()) {
      let adding = replace[Symbol[before]];
      if (adding !== undefined) {
        seen = true;
        new_before.concat(adding);
      }
    }
    if (!seen) {
      to_remove.push(item);
    }
    item.before = new_before.intersect(item.before)
  }
  for (const item of to_remove) {
    existing[existing.length-1].remove(item);
  }
  if (existing[existing.length-1].to_array().length === 0) {
    return false;
  }
  return true;
}

//get all of the non terms a chart parse recoginizes fully
function get_results(chart: HashSet<RecognizerItem>[]): RecognizerItem[] {
  let ret = [];
  if (chart.length === 0) {
    return [];
  }
  for (const item of chart[chart.length-1].to_array()) {
    if (item.from === 0) {
      ret.push(item);
    }
  }
  return ret;
}

export function reparse(to: ParseTree, input_stream: ParseTree[]) : [ParseTree[], number]{
  let steps_up = 0;
  let previous_target = to;
  let first_chart = recognize_append([],input_stream);
  let previous_row: [HashSet<RecognizerItem>[],ParseTree[]][] = [[first_chart,input_stream]];
  if (!to.render_info) {
    return [[], 0];
  }
  if (!to.render_info!.parent) {
    let ret = parse(input_stream);
    return [ret, 0];
  }
  let target: ParseTree = to.render_info.parent;
  while (true) {
    if (DEBUG){
      console.log("steps up:", steps_up);
      console.log("=======target=======");
      console.log(ptree_str(target));
    }
    steps_up += 1;
    let decomp_level = steps_up;
    let current_row: [HashSet<RecognizerItem>[], ParseTree[]][] = [];
    while (true) {
      let prev_index = Math.min(previous_row.length-1, decomp_level - steps_up);
      const [prev_chart, prev_stream] = previous_row[prev_index];
      if (prev_chart.length === 0) {
        current_row.push([[],[]]);
        decomp_level++;
        continue;
      }
      let [before, after, shouldnt_continue] = decompose(target,decomp_level,previous_target);
      const before_chart = recognize_append([],before);
      let results = [];
      if (!check(before_chart,prev_chart)) {
        current_row.push([[],[]]);
        decomp_level++;
      }
      else {
        let new_chart = recognize_append(prev_chart,after);
        results = get_results(new_chart);
        let valid = results.filter((t)=>t.rule.lhs===target.data);
        let new_stream = before.concat(prev_stream).concat(after);
        current_row.push([new_chart,new_stream]);
        if (valid.length !== 0) {
          let ret = parse(new_stream,target.render_info!.parent? true : false);
          return [ret, steps_up];
        }
      }

      if (shouldnt_continue) {
        if (results.length === 0) {
          return [[],steps_up]; //if we've fully decomposed and there are no valid parses for everything, we can return
        }
        break;
      }
      decomp_level++;
    }
    previous_row = current_row;
    if (!target.render_info!.parent) {
      return [[],steps_up];
    }
    target = target.render_info!.parent;
  }
}

export function parse(stream: ParseTree[], any_target = false){
  for (let i = 0; i < stream.length; i++) {
    stream[i].start = i;
    stream[i].end = i+1;
  }
  if (DEBUG) {
    console.log("=======inputs=======");
    for (const tree of stream) {
      console.log(ptree_str(tree));
    }
  }
  const len = stream.length;
  let state_sets = new Array(len+1).fill(0).map((z: number, i: number) => {return {items: new HashSet<Item>(item_hash), from: i }});
  grammar[0].forEach((rule)=>{
    state_sets[0].items.add({rule: rule, dot: 0, from: 0, concrete: false, forest: new ParseForest(grammar_start,0,rule.rhs)})
  });

  for (let i = 0; i <= len; i++) {
    let unprocessed: Item[] = state_sets[i].items.to_array();
    while(unprocessed.length > 0){
      const item: Item = unprocessed.pop() as Item;
      const next_symbol = item.rule.rhs[item.dot];
      if (item.dot != item.rule.rhs.length) {
        add_item(state_sets[i].items, unprocessed, {
          rule: item.rule, 
          dot: item.dot+1, 
          from: item.from,
          concrete: item.concrete,
          forest: item.forest, 
        });
      }
      if (i < len && next_symbol === stream[i].data){ //scan
        let new_tree = new ParseForest(stream[i].data,i,undefined,stream[i]);
        item.forest.add_child(item.dot,new_tree);
        state_sets[i+1].items.add({
          rule: item.rule,
          dot: item.dot+1,
          from: item.from,
          // nodes contining stream token are concrete
          concrete: true,
          forest: item.forest,
        });
      }
      if (next_symbol && !is_term(next_symbol)) { //predict
        for (const rule of grammar[next_symbol - grammar_start]) {
          let parse_forest = new ParseForest(rule.lhs,i, rule.rhs);
          add_item(state_sets[i].items, unprocessed, {
            rule: rule, 
            dot: 0, 
            from: i,
            // Nodes aren't concrete if they don't have concrete children -- and when we add the new items, they don't
            concrete: false,
            forest: parse_forest,
          });
        }
      }
      else if (item.concrete && item.dot === item.rule.rhs.length) { //complete
        for (const checking of state_sets[item.from].items.to_array()) {
          if (checking.rule.rhs[checking.dot] === item.rule.lhs){
            checking.forest.add_child(checking.dot, item.forest);
            add_item(state_sets[i].items, unprocessed, {
              rule: checking.rule, 
              dot: checking.dot + 1, 
              from: checking.from,
              // Concreteness propagates up the tree
              concrete: true, 
              forest: checking.forest,
            });
          }
        }
        continue;
      }
    }
    if(DEBUG){
      console.log("==="+state_sets[i].from.toString()+"===");
      for (const item of state_sets[i].items.to_array())
        console.log(item_str(item));
    }
  }

  let ret = [];
    for (const item of state_sets[0].items.to_array()){
      if(item.rule.lhs === grammar_start && item.dot === 0){
        let length = stream.length;
        let parses = item.forest.flatten((any_target)? length : -1);
        for (const parse of parses) {
          if (parse.end - parse.start === (stream[stream.length-1].end - stream[0].start)){
            let add = true;
            for (const tree of ret) {
              if (ptree_eq(tree,parse)) {
                add = false;
                break;
              }
            }
            if (add) {
              ret.push(parse);
              if (DEBUG) {
                console.log("--------------------------------");
                console.log(ptree_str(parse));
              }
            }
          }
        }
      }
    }
  return ret;
};


export function tokenize(stream: string){
  let ret: ParseTree[] = [];
  let token_index = 0;
  let slice = stream;
  while (slice.length > 0) {
    let max_len = 0;
    let max_token: ParseTree | undefined = undefined;
    let toke_type = 0;
    for (const re of regexes) {
      const match = re.exec(slice);
      if (match) {
        const ind = match[0].length;
        if (ind > max_len) {
          max_len = ind;
          max_token = {data: toke_type, children: [], token: slice.slice(0,max_len), num_imagined: 0, start: token_index,end: token_index+1};
        }
      }
      toke_type += 1;
    }
    if (max_len === 0) {
      max_len = 1; //ignore errors (for now)
    }
    else if (max_token){
      token_index += 1;
      ret.push(max_token);
    }
    slice = slice.slice(max_len);
  }
  return ret;
}

