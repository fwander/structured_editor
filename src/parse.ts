import { AST, S_AST } from "./ast";
import { setFocusedNode } from "./components/Editor";
import { defaults, grammar, grammar_start, is_list, is_term, regexes, Rule, Symbol } from "./gen/grammar";
import HashSet from "./HashSet";
import { is_box } from "./navigate";
import { get_alphabet } from "./nonterm_alphabets";

export type RecognizerItem = {
  rule: Rule;
  dot: number;
  from: number;
  concrete: boolean;
}

function recognizer_item_clone(item: RecognizerItem) {
  return {
    rule: item.rule,
    dot: item.dot,
    from: item.from,
    concrete: item.concrete,
  };
}

type Item = {
  rule: Rule;
  dot: number;
  from: number;
  concrete: boolean;
  forest: ParseForest;
}

export function item_hash(item: Item | RecognizerItem): string{
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
  variant: number;
  leaf?: ParseTree;
  start:number;
  flatten_memo: ParseTree[] = [];
  id: number;
  static last_id = 0;
  constructor(data: Symbol, start: number, variant: number, rhs?: Symbol[], leaf?: ParseTree){
    this.data = data;
    this.start = start;
    this.variant = variant;
    if (rhs) {
      for (const symbol of rhs) {
        this.children.push(new Map([[new ParseForest(symbol,-1,-1,undefined,
          {
          data: symbol,
          children: [],
          num_imagined: 1,
          start: -1,
          variant: -1,
          end: -1,
        }),1]]));
      }
    }
    this.leaf = leaf;
    this.id = ParseForest.last_id++;
  }
  add_child(index: number, child: ParseForest) {
    let amount = this.children[index].get(child) ?? 0;
    this.children[index].set(child,amount + 1);
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
    let ret_root = {children: [], data: this.data, num_imagined: 0, start: this.start, end: this.start, variant: this.variant};
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
              end: next_end,
              variant: this.variant
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

export const defaultParseTree: ParseTree = {
  children: [],
  data: Symbol.S,
  num_imagined: 0,
  start: 0,
  end: 1,
  variant: 0,
  render_info: {
  reactiveSet: (to: ParseTree)=>{},
  last_selected: 0,
  focus_flag: true,
  size: 0,
  cursor_index: 0,
  },
};

defaultParseTree.render_info!.ast = new S_AST(defaultParseTree);

export type RenderInfo = {
  reactiveSet: (to: ParseTree)=>void;
  last_selected: number;
  cursor_index: number;
  focus_flag: boolean;
  size: number;
  ast?: AST;
  parent?: ParseTree;
}

export function get_root(tree: ParseTree) {
  let looking_at = tree;
  while (looking_at.render_info?.parent) {
    looking_at = looking_at.render_info.parent;
  }
  return looking_at;
}

export type ParseTree = {
  children: ParseTree[];
  data: Symbol;
  token?: string;
  num_imagined: number;
  start: number;
  end: number;
  variant: number;
  render_info?: RenderInfo;
}

export function ptree_less_shallow(tree: ParseTree) {
  let ret = {
    children: tree.children.map((x)=>x),
    data:tree.data,
    token:tree.token,
    num_imagined: tree.num_imagined,
    start: tree.start,
    end: tree.end,
    variant: tree.variant,
    render_info: tree.render_info,
  }
  for (let child of ret.children) {
    child.render_info!.parent = ret;
  }
  if (tree.render_info?.parent) {
    const index = tree.render_info.parent.children.indexOf(tree);
    tree.render_info.parent.children[index] = ret;
  }
  return ret;
}

export function ptree_shallow(tree: ParseTree) {
  let ret = {
    children:tree.children,
    data:tree.data,
    token:tree.token,
    num_imagined: tree.num_imagined,
    start: tree.start,
    end: tree.end,
    variant: tree.variant,
    render_info: tree.render_info,
  }
  for (let child of ret.children) {
    child.render_info!.parent = ret;
  }
  if (tree.render_info?.parent) {
    const index = tree.render_info.parent.children.indexOf(tree);
    tree.render_info.parent.children[index] = ret;
  }
  return ret;
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
    if (t.token) {
      ret += "\"" + t.token + "\"";
    }
    if (is_box(t)) {
      ret += "BOX";
    }
    ret += "\n";
    for (const child of t.children) {
      helper(child,ind+"\t");
    }
  }
  helper(t,indent);
  return ret;
}

// belongs with chart parser
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

const DEBUG = false;

export function add_render_info(tree: ParseTree) {
  function recurse(tree_inner: ParseTree, parent: ParseTree) : number{
    if (tree_inner.render_info) {
      tree_inner.render_info.parent = parent;
      if (tree_inner.render_info!.cursor_index === -1) {
        if (tree_inner.token) {
          tree_inner.render_info!.cursor_index = tree_inner.token.length;
        }
        else {
          tree_inner.render_info!.cursor_index = 1;
        }
      }
      if (tree_inner.render_info.focus_flag) {
        tree_inner.render_info.focus_flag = false;
        setFocusedNode(tree_inner);
      }
    }
    else {
      tree_inner.render_info = {
        reactiveSet: (to: ParseTree) => {},
        last_selected: 0,
        cursor_index: 0,
        size: 0,
        focus_flag: false,
        parent: parent,
      }
    }
    if (tree_inner.children.length === 0) {
      tree_inner.render_info.size = 1;
      return 1;
    }
    else {
      let size = 0;
      for (let child of tree_inner.children) {
        size += recurse(child,tree_inner);
      }
      tree_inner.render_info.size = size;
      return size;
    }
  }
  for (let child of tree.children) {
    recurse(child,tree);
  }
}

export function concreteify(tree: ParseTree, start=0): number{
  tree.start = start;
  if (tree.children.length === 0) {
    if (!tree.token && is_term(tree.data) && defaults[tree.data].length !== 0) {
      tree.token = defaults[tree.data];
    }
    if (!is_term(tree.data) && grammar[tree.data - grammar_start].length === 1) {
      console.log("adding");
      console.log(Symbol[tree.data]);
      tree.children = grammar[tree.data - grammar_start][0].rhs.map(
        (x)=>{ return { 
                data: x,
                children: [],
                num_imagined: 1,
                start: -1,
                variant: -1,
                end: -1,
              }
      });
    }
    else {
      tree.end = start+1;
      return start + 1;
    }
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
    if (index !== 0 && is_term(siblings[index-1].data)) {
      siblings.splice(index-1,1,...tokenize(adding.concat(siblings[index-1].token? siblings[index-1].token! : "")));
      return siblings;
    }
  }
  siblings.splice(index,0,...tokenize(adding));

  return siblings;
}

export function decompose(tree: ParseTree, depth: number, exception?: ParseTree): [ParseTree[], ParseTree[], boolean] {
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
      if (!is_box(tree_inner)) {
        if (seen_exeption) {
          after.push(tree_inner)
        }
        else {
          before.push(tree_inner)
        }
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

let memo_stateset: HashSet<RecognizerItem>;

function get_zeroth_stateset() : HashSet<RecognizerItem>{
    if (memo_stateset !== undefined) {
        return memo_stateset;
    }
    memo_stateset = new HashSet<RecognizerItem>(item_hash);
    grammar[0].forEach((rule)=>{
      memo_stateset.add({rule: rule, dot: 0, from: 0, concrete: false});
  });
  let unprocessed: RecognizerItem[] = memo_stateset.to_array();
  while(unprocessed.length > 0){
    const item: RecognizerItem = unprocessed.pop() as RecognizerItem;
    const next_symbol = item.rule.rhs[item.dot];
    if (item.dot != item.rule.rhs.length) {
      let was_there = add_item(memo_stateset, unprocessed, {
        rule: item.rule, 
        dot: item.dot+1, 
        from: item.from,
        concrete: item.concrete,
      });
    }
    if (next_symbol && !is_term(next_symbol)) { //predict
      for (const rule of grammar[next_symbol - grammar_start]) {
        add_item(memo_stateset, unprocessed, {
          rule: rule, 
          dot: 0, 
          from: 0,
          // Nodes aren't concrete if they don't have concrete children -- and when we add the new items, they don't
          concrete: false,
        });
      }
    }
  }
  return memo_stateset;
}

function recognize_append(oldChart: HashSet<RecognizerItem>[], appending: ParseTree[]) {
  if (appending.length === 0) {
    return oldChart;
  }
  if (DEBUG && oldChart.length !== 0) {
    console.log("=======appending=======");
    for (const tree of appending) {
      console.log(ptree_str(tree));
    }
  }
  if (oldChart.length === 0) {
    oldChart.push(get_zeroth_stateset());
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
        let adding = {
          rule: item.rule, 
          dot: item.dot+1, 
          from: item.from,
          concrete: item.concrete,
        }
        add_item(oldChart[index], unprocessed, adding );
      }
      if (i < len && next_symbol === appending[i].data){ //scan
        let adding = {
          rule: item.rule,
          dot: item.dot+1,
          from: item.from,
          // nodes contining stream token are concrete
          concrete: true,
        }
        oldChart[index+1].add(adding);
      }
      if (next_symbol && !is_term(next_symbol)) { //predict
        for (const rule of grammar[next_symbol - grammar_start]) {
          add_item(oldChart[index], unprocessed, {
            rule: rule, 
            dot: 0, 
            from: index,
            // Nodes aren't concrete if they don't have concrete children -- and when we add the new items, they don't
            concrete: false,
          });
        }
      }
      else if (item.concrete && item.dot === item.rule.rhs.length) { //complete
        let new_before = new HashSet<Symbol>((x)=>Symbol[x]);
        for (const checking of oldChart[item.from].to_array()) {
          if (checking.rule.rhs[checking.dot] === item.rule.lhs){
            let was_there = add_item(oldChart[index], unprocessed, {
              rule: checking.rule, 
              dot: checking.dot + 1, 
              from: checking.from,
              // Concreteness propagates up the tree
              concrete: true, 
            });
          }
        }
        continue;
      }
    }
  }
  if(DEBUG){
    for (let i = 0; i < oldChart.length; i++) {
      console.log("==="+i+"===");
      for (const item of oldChart[i].to_array())
        console.log(recognizer_item_str(item));
    }
  }
  return oldChart;
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

function left_and_right(from: ParseTree): [ParseTree[], ParseTree[]] {
  let left: ParseTree[] = [];
  let right: ParseTree[] = [];
  let looking_at = from;
  while (looking_at.render_info?.parent) {
    const parent = looking_at.render_info.parent;
    let left_of_looking_at = true;
    let ind = 0;
    for (const sibling of parent.children) {
      if (sibling !== looking_at) {
        if (left_of_looking_at) {
          left.splice(ind,0,sibling);
          ind++;
        }
        else {
          right.push(sibling);
        }
      }
      else {
        left_of_looking_at = false;
      }
    }
    looking_at = parent;
  }
  return [left,right];
}

function mutationFilter<T>(arr: T[], cb: (x: T)=>boolean) {
  for (let l = arr.length - 1; l >= 0; l -= 1) {
    if (!cb(arr[l])) arr.splice(l, 1);
  }
}

function decompose_edge(stream: ParseTree[], is_right_edge: boolean) : ParseTree[] {
  let ind = 0;
  if (is_right_edge) {
    ind = stream.length-1;
  }
  let looking_at = stream[ind];
  while(!is_term(looking_at.data)) {
    stream.splice(ind,1,...looking_at.children);
    if (is_right_edge) {
      ind = stream.length-1;
    }
    looking_at = stream[ind];
  }
  mutationFilter(stream, (x)=>!is_box(x));
  if (is_right_edge) {
    ind = stream.length-1;
  }
  let edge = stream[ind];
  let ret = [];
  while (is_term(edge.data)) {
    ret.push(edge);
    stream.splice(ind,1);
    if (is_right_edge) {
      ind = stream.length-1;
    }
  }
  return ret;
}

export function new_reparse(to: ParseTree): ParseTree[] {
  let middle = to.children;
  middle = middle.filter((x)=>!is_box(x));
  let [left, right] = left_and_right(to);
  left = left.filter((x)=>!is_box(x));
  right = right.filter((x)=>!is_box(x));
  while(true) {
    let middle_chart = recognize_append([],middle);
    let middle_results = get_results(middle_chart);
    if (!middle_results.some((item)=>item.rule.lhs === grammar_start)) {
      // if middle can't turn into start then we know we have an invalid parse
      break;
    }
    let results = parse(left.concat(middle).concat(right));
    if (results.length !== 0) {
      return results;
    }
    let inserting = decompose_edge(left,true);
    middle = inserting.concat(middle);
    let appending = decompose_edge(right,false);
    middle = middle.concat(appending);
  }
  return [];
}

function reparse(to: ParseTree, input_stream: ParseTree[]) : [ParseTree, number][]{
  let steps_up = 0; //row
  let previous_target = to;
  let first_chart = recognize_append([],input_stream);
  let previous_row: [HashSet<RecognizerItem>[],ParseTree[]][] = [[first_chart,input_stream]];
  if (!to.render_info) {
    return [];
  }
  if (!to.render_info!.parent) {
    let ret = parse(input_stream);
    return ret.map((x)=>[x,0])
  }
  let results = get_results(first_chart);
  let valid = results.filter((t)=>t.rule.lhs===to.data);
  if (valid.length !== 0) {
    let ret = parse(input_stream,to.render_info!.parent? true : false);
    let valid_ret = ret.filter((t)=>t.data===to.data);
    if (valid_ret.length !== 0) {
      return valid_ret.map((x)=>[x,steps_up]);
    }
  }
  let target: ParseTree = to.render_info.parent;
  while (true) {
    steps_up += 1;
    if (DEBUG){
      console.log("steps up:", steps_up);
      console.log("=======target=======");
      console.log(ptree_str(target));
    }
    let decomp_level = 0; //column
    let current_row: [HashSet<RecognizerItem>[], ParseTree[]][] = [];
    while (true) {
      let prev_index = Math.max(Math.min(previous_row.length-1, decomp_level - 1),0);
      let [prev_chart, prev_stream] = previous_row[prev_index];
      let [before, after, shouldnt_continue] = decompose(target,decomp_level,previous_target);
      if (prev_chart.length === 0) {
        current_row.push([[],[]]);
        decomp_level++;
        if (shouldnt_continue) {
          break;
        }
        continue;
      }
      let can_skip = !get_results(prev_chart).some((x)=>x.rule.lhs === target.data);
      if (can_skip) {
        for (const tree of get_results(prev_chart)) {
          console.log(recognizer_item_str(tree));
        }
        let new_stream = before.concat(prev_stream).concat(after);
        current_row.push([prev_chart,new_stream]);
        decomp_level++;
        if (shouldnt_continue) {
          break;
        }
        continue;
      }
      let chart = prev_chart;
      if (before.length !== 0) {
        chart = recognize_append([],before.concat(prev_stream));
      }
      if (DEBUG) {
        console.log("before");
        for (const tree of before) {
          console.log(ptree_str(tree));
        }
        console.log("current");
        for (const tree of prev_stream) {
          console.log(ptree_str(tree));
        }
        console.log("after");
        for (const tree of after) {
          console.log(ptree_str(tree));
        }
        console.log("shouldn't continue");
        console.log(shouldnt_continue);
      }
      let results = [];
      if(DEBUG){
        for (let i = 0; i < prev_chart.length; i++) {
          console.log("==="+i+"===");
          for (const item of prev_chart[i].to_array())
            console.log(recognizer_item_str(item));
        }
      }
      let can_insert = chart[chart.length-1].to_array().length !== 0;
      if (!can_insert) {
        current_row.push([[],[]]);
        decomp_level++;
      }
      else {
        console.log("prev_chart");
        for (let i = 0; i < prev_chart.length; i++) {
          console.log("==="+i+"===");
          for (let item of prev_chart[i].to_array()) {
            console.log(recognizer_item_str(item));
          }
        }
        let new_chart = recognize_append(prev_chart,after);
        results = get_results(new_chart);
        let new_stream = before.concat(prev_stream).concat(after);
        if (results.length !== 0) {
          current_row.push([new_chart,new_stream]);
        }
        else {
          current_row.push([[],[]]);
        }
        let possible_ret: [ParseTree,number][] = [];
        let looking_at = target;
        let prev = target;
        let cont = true;
        let ret = parse(new_stream,target.render_info!.parent? true : false);
        let up = 0;
        let min = Infinity;
        outer:
        while (cont) {
          console.log("going up!")
          console.log(ptree_str(looking_at))
        let valid = results.filter((t)=>t.rule.lhs===looking_at.data);
        if (valid.length !== 0) {
          let valid_ret = ret.filter((t)=>t.data===looking_at.data);
          if (valid_ret.length !== 0) {
            for (const ret of valid_ret) {
              if (ret.num_imagined === min) {
                possible_ret.push([ret,steps_up+up]);
              }
              else if (ret.num_imagined < min) {
                possible_ret = [[ret,steps_up+up]];
                min = ret.num_imagined;
              }
            }
          }
        }
        prev = looking_at;
        up++;
        looking_at = looking_at.render_info!.parent!;
        if (!looking_at.render_info?.parent) {
            break;
        }
        for (const sibling of looking_at.children) {
            if (!is_box(sibling) && sibling !== prev) {
                break outer; //sorry
            }
        }
        } 
        if (possible_ret.length !== 0) {
          return possible_ret;
        }
      }

      if (shouldnt_continue) {
        if (results.length === 0) {
          return []; //if we've fully decomposed and there are no valid parses for everything, we can return
        }
        break;
      }
      decomp_level++;
    }
    previous_row = current_row;
    if (!target.render_info?.parent) {
      return [];
    }
    previous_target = target;
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
    state_sets[0].items.add({rule: rule, dot: 0, from: 0, concrete: false, forest: new ParseForest(grammar_start,0,rule.variant,rule.rhs)})
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
        let new_tree = new ParseForest(stream[i].data,i,item.rule.variant,undefined,stream[i]);
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
          let parse_forest = new ParseForest(rule.lhs,i, rule.variant, rule.rhs);
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
  let error_slice = "";
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
          max_token = {data: toke_type, children: [], token: slice.slice(0,max_len), num_imagined: 0, start: token_index, end: token_index+1, variant: -1};
        }
      }
      toke_type += 1;
    }
    if (max_len === 0) {
      max_len = 1; //ignore errors (for now)
      error_slice += slice[0];
    }
    else if (max_token){
      if (error_slice.length !== 0) {
        alert(error_slice);
        ret.push({data: Symbol.unknown, children: [], token: error_slice, num_imagined: 0, start: token_index, end: token_index+1,variant: -1});
        max_token.start+=1;
        max_token.end+=1;
        error_slice = "";
      }
      token_index += 1;
      ret.push(max_token);
    }
    slice = slice.slice(max_len);
  }
  return ret;
}

