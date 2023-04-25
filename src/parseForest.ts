import PriorityQueue from "ts-priority-queue";
import { Symbol } from "./gen/grammar";
import { ParseTree } from "./parse";
import { NTreeLeaf } from "./parse_searcher";

const MAX_CONSEC_IMAGINED = 3;

export class ParseForest {
  children: Map<ParseForest,number>[] = [];
  data:Symbol;
  variant: number;
  leaf?: ParseTree;
  start:number;
  n_trees_memo?: NTreeLeaf[][];
  flatten_memo?: ParseTree[];
  min_imagined: [number,number][] = [];
  id: number;
  static last_id = 0;
  constructor(data: Symbol, start: number, variant: number, rhs?: Symbol[], leaf?: ParseTree){
    this.data = data;
    this.start = start;
    this.variant = variant;
    if (rhs) {
      if (rhs.length === 0) {
          this.children.push(new Map([[new ParseForest(Symbol.epsilon,start,0,undefined,
            {
            data: Symbol.epsilon,
            children: [],
            start: start,
            end: start,
            variant: 0,
            num_imagined: 0,
          }),1]]));
      }
      else {
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
    }
    this.leaf = leaf;
    this.id = ParseForest.last_id++;
  }

  remove_imagined(index: number) {
    for (const [forest, edge] of this.children[index]) {
      if (forest.leaf && forest.leaf.start === -1) {
        if (edge > 0)
          this.children[index].set(forest,edge-1);
        else 
          this.children[index].delete(forest)
        return;
      }
    }
  }


  //must be called in order
  set_min_imagined(ind: number, imagined: number) {
    if (this.min_imagined.length === 0) {
      this.min_imagined.push([ind,imagined]);
    }
    else if (this.min_imagined[this.min_imagined.length-1][0] === ind){
      this.min_imagined[this.min_imagined.length-1][1] = imagined;
    }
    else if (ind > this.min_imagined[this.min_imagined.length-1][0]) {
      this.min_imagined.push([ind,imagined]);
    }
    else {
      throw new Error("calling set min imagined out of order");
    }
  }
  bs(end: number) {
    let low = 0;
    let hi = this.min_imagined.length-1;

    while (low <= hi) {
      let m = Math.floor((low + hi) / 2);
      let at = this.min_imagined[m];
      if (at[0] < end) { // at lt target
        low = m + 1;
      } else if (at[0] > end) { // at gt target
        hi = m - 1;
      } else { // at eq target
        low = m;
        break;
      }
    }
    return low
  }
  get_min_imagined(end: number){
    let ind = this.bs(end);
    if (this.min_imagined[ind][0] === end) {
      return this.min_imagined[ind][1];
    }
    return -1;
  }
  get_sub_heurisic(prev_end: number, next_start: number) {
    if (this.leaf) {
      throw new Error("can't call heuristic on an almost leaf");
    }

    let ret_imagined = Number.MAX_SAFE_INTEGER;

    let ind = this.bs(prev_end);
    if (next_start === this.min_imagined[ind][0] && (next_start === prev_end)) {
      return this.min_imagined[ind][1];
    }
    while (ind < this.min_imagined.length && this.min_imagined[ind][0] <= next_start) {
      ret_imagined = Math.min(this.min_imagined[ind][1], ret_imagined);
      ind++;
    }
    return ret_imagined;

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

  get_expansion(): NTreeLeaf {
    if (this.leaf) {
      return this.leaf;
    }
    else {
      return this
    }
  }

  get_n_trees( edge_context: Map<ParseForest,Map<ParseForest,number>>) : NTreeLeaf[][] {
    if (this.n_trees_memo) {
      return this.n_trees_memo;
    }
    let ret: NTreeLeaf[][] = [[]];
    let next_ret: NTreeLeaf[][] = [];
    for (let i = 0; i < this.children.length; i++) {
      next_ret = [];
      for (const partial of ret) {
        for (const [forest, edge] of this.children[i]) {
          if ((edge_context.get(this)?.get(forest) ?? 0) <= edge){
            next_ret.push([...partial,forest.get_expansion()]);
          }
          else {
            console.log("skipped " + Symbol[forest.data])
          }
        }
      }
      ret = next_ret;
    }
    return ret;
  }

  flatten(edge_context: Map<ParseForest, Map<ParseForest, number>> = new Map(), min_imagined: Map<number, Map<number, number>> = new Map() ): ParseTree[] {
    if (this.flatten_memo !== undefined) {
      return this.flatten_memo;
    }
    if (this.leaf) {
      return [this.leaf];
    }
  
    let pq = new PriorityQueue<[ParseTree, number]>({
      comparator: (a, b) => {
        const imagined_diff = a[0].num_imagined - b[0].num_imagined;
        if (imagined_diff !== 0) {
          return imagined_diff;
        }
        return (b[1] - a[1]);
      }
    });
    let initial_tree: ParseTree = {
      children: [],
      data: this.data,
      num_imagined: 0,
      start: this.start,
      end: this.start,
      variant: this.variant
    };
    pq.queue([initial_tree, 0]);
  
    let ret: ParseTree[] = [];
  
    while (!(pq.length === 0)) {
      let [current_tree, index] = pq.dequeue()!;
      const current_min_imagined = min_imagined.get(current_tree.start)?.get(current_tree.end) ?? Infinity;

      let max_chain = 0;
      for (const child of current_tree.children) {
        if (child.start == -1) {
          max_chain++;
        }
        else {
          max_chain = 0;
        }
      }
      if (max_chain > MAX_CONSEC_IMAGINED) {
        continue;
      }
  
      if (current_tree.num_imagined > current_min_imagined) {
        continue;
      }

  
      if (index === this.children.length) {
        ret.push(current_tree);
        let end_map = min_imagined.get(current_tree.start);
        if (!end_map) {
          end_map = new Map();
          min_imagined.set(current_tree.start,end_map);
        }
        end_map.set(current_tree.end, Math.min(current_min_imagined,current_tree.num_imagined))
      } else {
        for (const child_forest of this.children[index]) {
        if (edge_context.get(this)?.get(child_forest[0]) !== child_forest[1]) {
            let map = edge_context.get(this);
            if (!map) {
              let adding = new Map();
              edge_context.set(this, adding);
              map = adding;
            }
            map.set(child_forest[0], (map.get(child_forest[0]) ?? 0) + 1);
            let child_trees = child_forest[0].flatten(edge_context);
            map.set(child_forest[0], (map.get(child_forest[0]) ?? 0) - 1);
            for (const child_tree of child_trees) {
              if (child_tree.start === current_tree.end || child_tree.start === -1) {
                let next_end = (child_tree.start === -1) ? current_tree.end : child_tree.end;
                let next_tree: ParseTree = {
                  children: current_tree.children.concat([child_tree]),
                  num_imagined: current_tree.num_imagined + child_tree.num_imagined,
                  data: current_tree.data,
                  start: current_tree.start,
                  end: next_end,
                  variant: current_tree.variant
                };
                pq.queue([next_tree, index + 1]);
              }
            }
          }
        }
      }
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

    let stratified: {[x: number]: number} = {};
    for (const tree of ret) {
      const current = stratified[tree.end];
      if ((current === undefined) || (tree.num_imagined < current)) {
        stratified[tree.end] = tree.num_imagined;
      }
    }

    function filter(t: ParseTree) {
      let all_imagined = !t.children.some(leaf=>leaf.start!==-1);
      if (all_imagined) return false;
      if (has_conversion(t,t.data)) return false;
      if (t.num_imagined > stratified[t.end]) return false;

      return true;
    }


    ret = ret.filter(filter);

    this.flatten_memo = ret.map((x) => x);
    return ret;
    
  }

  
}

function heuristic(tree: ParseTree, end: number): number {
  const remainingTokens = Math.max(0, end - tree.end);
  const avgImaginedTokensPerToken = tree.num_imagined / (tree.end - tree.start);
  const estimatedImaginedTokens = remainingTokens * avgImaginedTokensPerToken;
  return estimatedImaginedTokens;
}
