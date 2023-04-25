import { AST } from "./ast";
import { setFocusedNode } from "./components/Editor";
import { factory_tbl, S_AST } from "./gen/ast_gen";
import { defaults, grammar, grammar_start, is_list, is_term, regexes, Rule, Symbol } from "./gen/grammar";
import HashSet from "./HashSet";
import { is_box, is_epsilon } from "./navigate";
import PriorityQueue from "ts-priority-queue";
import { NTree, NTreeLeaf, solve } from "./parse_searcher";

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
  min_imagined: number;
  token?: ParseTree;
  before?: Item;
  before2?: Item;
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
  ret += "(" + item.from.toString() + ")";
  ret += "[" + item.min_imagined.toString() + "]";
  if (item.concrete) {
    ret += "!";
  }
  return ret;
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

// defaultParseTree.render_info!.ast = new S_AST(defaultParseTree);

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

export function deep_copy(tree: ParseTree): ParseTree {
  let ret = {
    children: tree.children.map(deep_copy),
    data:tree.data,
    token:tree.token,
    num_imagined: tree.num_imagined,
    start: tree.start,
    end: tree.end,
    variant: tree.variant,
  }
  return ret;
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

export function ptree_eq(t1: ParseTree, t2: ParseTree) {
  if (t1 === t2) {
    return true;
  }

  if (t1.children.length !== t2.children.length){
    return false;
  }

  if (t1.data !== t2.data) {
    return false;
  }

  if (t1.variant !== t2.variant) {
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
    ret += " ~ " + t.num_imagined;
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

function parse_add_item(state_set: HashSet<Item>, unprocessed: Item[], adding: Item) {
  const was_there = state_set.has(adding);
  if (was_there !== undefined) {
    if (was_there.min_imagined > adding.min_imagined) {
      state_set.remove(was_there);
      state_set.add(adding);
      unprocessed.push(adding);
      return undefined;
    }
    else {
      return was_there;
    }
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

function make_ast(tree: ParseTree): AST | undefined {
  if (is_term(tree.data)) {
    return undefined; 
  }
  return factory_tbl[tree.data - grammar_start](tree);
}

function attach_ast(tree: ParseTree): void {
  tree.render_info!.ast = make_ast(tree);
}

export function add_render_info(tree: ParseTree) {
  function recurse(tree_inner: ParseTree, parent: ParseTree) : number{
    if (is_box(tree_inner) && is_list(tree_inner.data) && is_list(parent.data) && tree_inner.data === parent.data) {
      return 0;
    }
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
        ast: undefined,
        parent: parent,
      }
    }
    attach_ast(tree_inner);
    if (tree_inner.render_info.ast === undefined && !is_term(tree_inner.data)) {
      tree_inner.render_info.ast = factory_tbl[tree_inner.data - grammar_start](tree_inner);
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
      tree_inner.children = tree_inner.children.filter(x => x.render_info);
      tree_inner.render_info.size = size;
      return size;
    }
  }
  for (let child of tree.children) {
    recurse(child,tree);
  }
  tree.children = tree.children.filter(x => x.render_info);
    if (tree.render_info!.cursor_index === -1) {
      if (tree.token) {
        tree.render_info!.cursor_index = tree.token.length;
      }
      else {
        tree.render_info!.cursor_index = 1;
      }
    }
  attach_ast(tree);
}

export function reset_focus(tree: ParseTree): boolean {
  let found = false;
  if (tree.render_info) {
    if (tree.render_info.focus_flag) {
      found = true;
      tree.render_info.focus_flag = false;
    }
  }
  for (let child of tree.children) {
    if (reset_focus(child)) {
      found = true;
    }
  }
  return found;
}

export function concreteify(tree: ParseTree, start=0): number{
  tree.start = start;
  if (tree.children.length === 0) {
    if (!tree.token && is_term(tree.data) && defaults[tree.data].length !== 0) {
      tree.token = defaults[tree.data];
      tree.num_imagined = 0;
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

function decompose_edge(stream: ParseTree[], is_right_edge: boolean) : ParseTree[] {
  if (stream.length === 0) {
    return [];
  }
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
    if (looking_at === undefined) {
      break;
    }
  }
  if (is_right_edge) {
    ind = stream.length-1;
  }
  let edge = stream[ind];
  let ret = [];
  while (is_term(edge.data) || is_box(edge)) {
    if (!is_box(edge) && !(is_epsilon(edge))) {
      ret.push(edge);
    }
    stream.splice(ind,1);
    if (is_right_edge) {
      ind = stream.length-1;
    }
    edge = stream[ind];
    if (edge === undefined) {
      break;
    }
  }
  return ret;
}

export function new_reparse(to: ParseTree): [ParseTree, ParseTree][] {
  let middle = to.children;
  middle = middle.filter((x)=>!is_box(x));
  middle = middle.filter((x)=>!is_epsilon(x));
  let [left, right] = left_and_right(to);
  while(true) {
    let end_of_left = left[left.length];
    while(end_of_left && (is_box(end_of_left) || is_epsilon(end_of_left))) {
      left.pop();
      end_of_left = left[left.length];
    }
    let beginning_of_right = right[0];
    while(beginning_of_right && (is_box(beginning_of_right) || is_epsilon(beginning_of_right))) {
      right.shift();
      beginning_of_right = right[0];
    }
    let middle_chart = recognize_append([],middle);
    let middle_results = get_results(middle_chart);
    if (!middle_results.some((item)=>item.rule.lhs === grammar_start)) {
      // if middle can't turn into start then we know we have an invalid parse
      break;
    }
    let results = parse(left.concat(middle).concat(right), get_root(to), to);
    if (results) {
      let path = make_path(to);
      return [lowest_edit(get_root(to),path,results)];
    }
    if (left.length === 0 && right.length === 0) {
      return [];
    }
    let inserting = decompose_edge(left,true);
    middle = inserting.concat(middle);
    let appending = decompose_edge(right,false);
    middle = middle.concat(appending);
  }
  return [];
}


export function parse(stream: ParseTree[], root: ParseTree, target: ParseTree): ParseTree | undefined{
  let index_map = []
  for (let i = 0; i < stream.length; i++) {
    index_map.push(stream[i].start);
    if (i === stream.length) {
      index_map.push(stream[i].end);
    }
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
    state_sets[0].items.add({rule: rule, dot: 0, from: 0, concrete: false, min_imagined: 0})
  });

  for (let i = 0; i <= len; i++) {
    let unprocessed: Item[] = state_sets[i].items.to_array();
    while(unprocessed.length > 0){
      const item: Item = unprocessed.pop() as Item;
      const next_symbol = item.rule.rhs[item.dot];
      if (item.dot != item.rule.rhs.length) { //imagine
          parse_add_item(state_sets[i].items, unprocessed, {
            rule: item.rule, 
            dot: item.dot+1, 
            from: item.from,
            concrete: item.concrete,
            min_imagined: item.min_imagined + 1,
            before: item, 
          });
      }
      if (i < len && next_symbol === stream[i].data){ //scan
        let adding = 
        {
          rule: item.rule,
          dot: item.dot+1,
          from: item.from,
          // nodes contining stream token are concrete
          token: stream[i],
          concrete: true,
          min_imagined: item.min_imagined,
          before: item,
        };
        let was_there = state_sets[i+1].items.has(adding);
        if (!was_there || (was_there.min_imagined > adding.min_imagined)) {
          if (was_there) {
            state_sets[i+1].items.remove(was_there);
          }
          state_sets[i+1].items.add(adding);
        }
      }

      if (next_symbol && !is_term(next_symbol)) { //predict
        for (const rule of grammar[next_symbol - grammar_start]) {
          parse_add_item(state_sets[i].items, unprocessed, {
            rule: rule, 
            dot: 0, 
            from: i,
            // Nodes aren't concrete if they don't have concrete children -- and when we add the new items, they don't
            concrete: rule.rhs.length === 0 ? true : false,
            min_imagined: 0,
            before: item,
          });
        }
      }
      else if (item.concrete && item.dot === item.rule.rhs.length) { //complete
        for (const checking of state_sets[item.from].items.to_array()) {
          if (checking.rule.rhs[checking.dot] === item.rule.lhs){
            let new_imagined = checking.min_imagined + item.min_imagined;
            let adding = {
              rule: checking.rule, 
              dot: checking.dot + 1, 
              from: checking.from,
              // Concreteness propagates up the tree
              concrete: true, 
              min_imagined: new_imagined,
              before: item,
              before2: checking,
            };
            parse_add_item(state_sets[i].items, unprocessed, adding);
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

  let min: Item | undefined = undefined;
    for (const item of state_sets[len].items.to_array()){
      if(item.rule.lhs === grammar_start && item.dot === item.rule.rhs.length){
        if (min === undefined || item.min_imagined < min.min_imagined)
          min = item;
      }
    }
  if (min){
    let parent = {
      data: grammar_start,
      children: [] as ParseTree[],
      start: 0,
      end: 0,
      num_imagined: 0,
      variant: 0,
    };
    let ret : ParseTree | undefined = reconstruct(min);
    if (ret !== undefined) {
      parent.children = [ret];
      return parent;
    }
  }
  return undefined;
  // return solve(forests, stream.length, root, target, leaves);
  // return ret;
};

function reconstruct(item: Item, parent?: ParseTree) : ParseTree | undefined {
  if (item.dot === 0 && item.rule.rhs.length !== 0) {
    return undefined;
  }
  let ptree: ParseTree;
  if (item.rule.rhs.length === 0) {
      item.token = {
        data: Symbol.epsilon,
        children: [],
        start: item.from,
        end: item.from,
        num_imagined: 0,
        variant: 0,
      };
  }
  if (item.token) {
      ptree = item.token;
  }
  else {
    ptree = {
      data: item.rule.rhs[item.dot-1],
      children: [],
      start: item.from,
      end: item.from,
      num_imagined: 0,
      variant: 0,
    };
  }
  if (parent) {
    parent.children[Math.max(item.dot-1,0)] = ptree;
  }
  if (!item.before && !item.before2 || (item.dot === 0)) {
    return undefined;
  }
  if (item.before) {
    let next_parent = parent;
    if ( item.before.dot === item.before.rule.rhs.length) {
        next_parent = ptree;
      }
    ptree.variant = item.before.rule.variant;
    reconstruct(item.before, next_parent);
  }
  if (item.before2) {
    let next_parent = parent;
    if ( item.before2.dot === item.before2.rule.rhs.length) {
        next_parent = ptree;
      }
    reconstruct(item.before2, parent);
  }
  return ptree;
}

function make_path(target: ParseTree): number[] {
    let looking_at = target;
    let prev = target;
    let ret: number[] = [];
    while (looking_at.render_info && looking_at.render_info.parent) {
        looking_at = looking_at.render_info.parent;
        let ind = looking_at.children.indexOf(prev);
        ret.unshift(ind);
        prev = looking_at;
    }
    return ret;
}

function lowest_edit(before: ParseTree, path: number[], next: ParseTree): [ParseTree, ParseTree] {
    function compare(b: ParseTree, n: ParseTree, skip: number) {
      for (let i = 0; i < n.children.length; i++){
          if (i !== skip && !ptree_eq(b.children[i],n.children[i])){
              return false;
          }
      }
      return true;
    }
    let before_l = before;
    let next_l = next;
    let ret: [ParseTree, ParseTree] = [next_l, before_l]
    for (let i = 0; i < path.length-2; i++) {
        if (!compare(before_l,next_l,path[i])) {
            return ret;
        }
        ret = [next_l, before_l];
        before_l = before_l.children[path[i]];
        next_l = next_l.children[path[i]];
    }
    return ret;
}


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

