import { defaults, grammar, grammar_start, is_term, regexes, Rule, Symbol } from "./gen/grammar";
import HashSet from "./HashSet";


type Item = {
  rule: Rule;
  dot: number;
  from: StateSet;
  concrete: boolean;
  forest: ParseForest;
}

function item_hash(item: Item): string{
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
  ret += item.from.from.toString()
  if (item.concrete) {
    ret += "!";
  }
  return ret;
}

function item_str(item: Item): string{
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
  ret += "(" + item.from.from.toString() + ")";
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

export type ParseTree = {
  children: ParseTree[];
  parent?: ParseTree;
  reactiveSet?: (to: ParseTree)=>void;
  data: Symbol;
  token?: string;
  num_imagined: number;
  start: number;
  end: number;
}

export function ptree_deep_copy(tree: ParseTree): ParseTree {
  function recurse(tree: ParseTree): ParseTree {
    return {
      children: tree.children.map(recurse),
      reactiveSet:tree.reactiveSet,
      data:tree.data,
      token:tree.token,
      num_imagined: tree.num_imagined,
      start: tree.start,
      end: tree.end,
    }
  }
  let ret = recurse(tree);
  correct_parents(ret);
  return ret;
}

export function ptree_less_shallow(tree: ParseTree) {
  return {
    children: tree.children.map((x)=>x),
    parent: tree.parent,
    reactiveSet:tree.reactiveSet,
    data:tree.data,
    token:tree.token,
    num_imagined: tree.num_imagined,
    start: tree.start,
    end: tree.end,
  }
}

export function ptree_shallow(tree: ParseTree) {
  return {
    children:tree.children,
    parent: tree.parent,
    reactiveSet:tree.reactiveSet,
    data:tree.data,
    token:tree.token,
    num_imagined: tree.num_imagined,
    start: tree.start,
    end: tree.end,
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

function add_item(state_set: HashSet<Item>, unprocessed: Item[], adding: Item) {
  if (state_set.has(adding)) {
    return;
  }
  unprocessed.push(adding);
  state_set.add(adding);
}

type StateSet = {
  items: HashSet<Item>;
  from: number;
};

const DEBUG = true;
export function correct_parents(tree: ParseTree){
  for (let child of tree.children) {
    correct_parents(child);
    child.parent = tree;
  }
}

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

export function retokenize(to: ParseTree, at: number) {
  const children = to.children
  let start = at;
  while(is_term(children[start].data)) {
    start -= 1;
    if (start === -1) {
      break;
    }
  }
  start +=1;
  let end = at+1;
  while(end < children.length && (is_term(children[end].data))) {
    end += 1;
  }
  let middle = tokenize(children.slice(start,end).reduce((acc, t)=> acc + (t.token? t.token : "") ,""))
  let ret = children.slice(0, start).concat(middle).concat(children.slice(end+1,children.length));
  for (let i = 0; i < ret.length; i++) {
    ret[i].start = i;
    ret[i].end = i+1;
  }
  return ret;
}

function decompose(tree: ParseTree, depth: number, exception: ParseTree, exception_children: ParseTree[]): [ParseTree[], boolean] {
  let ret: ParseTree[] = [];
  let valid_decomp = false; 
  function recurse(tree_inner: ParseTree, depth: number) {
    if (depth < 0) {
      ret.push(tree_inner)
      return;
    }
    if (tree_inner === exception) {
      ret = ret.concat(exception_children);
      valid_decomp = true;
      return;
    }
    if (tree_inner.children.length === 0) {
      ret.push(tree_inner);
    }
    for (let child of tree_inner.children) {
      recurse(child, depth - 1);
    }
  }
  recurse(tree, depth);
  return [ret, valid_decomp];
}
    // if (!target.parent) {
    //   let memo: {[x: string]: ParseTree[]} = {};
    //   let new_results: ParseTree[] = [];
    //   for (const result of results) {
    //     if (memo[Symbol[result.data]] === undefined) {
    //       let results = parse([result]);
    //       memo[Symbol[result.data]] = results;
    //       new_results = new_results.concat(results);
    //     }
    //     else {
    //       let results = (memo[Symbol[result.data]] as ParseTree[]).map((x)=>x);
    //       for (let memoized of results) {
    //         memoized.children[0] = result;
    //       }
    //       new_results = new_results.concat(results);
    //     }
    //   }
    //   return [new_results, steps_up];
    // }

export function reparse(to: ParseTree, input_stream: ParseTree[]) : [ParseTree[], number]{
  let target = to;
  // let results = parse(stream, true);
  let steps_up = 0;
  while (true) {
    if (DEBUG){
      console.log("steps up:", steps_up);
      console.log("=======target=======");
      console.log(ptree_str(target));
    }
    for (let i = 0; i <= steps_up; i++) {
      let [stream, shouldnt_continue] = decompose(target,i,to,input_stream);
      if (!shouldnt_continue) {
        continue;
      }
      let results = parse(stream, target.parent? true : false);
      let valid = results.filter((t)=>t.data===target.data);
      if (valid.length !== 0) {
        return [valid, steps_up];
      }
      if (i === steps_up && results.length === 0) {
        return [[],steps_up];
      }
    }
    if (!target.parent) {
      return [[],steps_up];
    }
    steps_up += 1;
    target = target.parent;
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
    state_sets[0].items.add({rule: rule, dot: 0, from: state_sets[0], concrete: false, forest: new ParseForest(grammar_start,0,rule.rhs)})
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
            from: state_sets[i],
            // Nodes aren't concrete if they don't have concrete children -- and when we add the new items, they don't
            concrete: false,
            forest: parse_forest,
          });
        }
      }
      else if (item.concrete && item.dot === item.rule.rhs.length) { //complete
        for (const checking of state_sets[item.from.from].items.to_array()) {
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

