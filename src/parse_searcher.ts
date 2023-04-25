import { zhangShasha } from "./diff";
import { Symbol } from "./gen/grammar";
import { ParseTree, ptree_eq, ptree_shallow } from "./parse"
import PriorityQueue from "ts-priority-queue";
import { ParseForest } from "./parseForest";

export type NTreeChild = NTree | ParseForest | ParseTree;
export type NTreeLeaf = ParseForest | ParseTree;

export class NTree {
    source: ParseForest;
    children: NTreeChild[];
    serialization: string | undefined;
    leaves: NTreeLeaf[] | undefined;
    len: number | undefined;
    variant: number;
    data: Symbol;

    private constructor(kids: NTreeChild[], src: ParseForest) {
        this.children = kids;
        this.source = src;
        this.variant = src.variant;
        this.data = src.data;
        this.serialize();
    }

    get_len(): number {
        if (this.len) {
            return this.len;
        }
        let ret = 0;
        for (const child of this.children) {
            if (child instanceof ParseForest) {
                continue;
            }
            if (child instanceof NTree) {
                ret += child.get_len();
                continue
            }
            
            if (child.start !== -1 && child.data !== Symbol.epsilon) {
                ret++;
            }
        }
        return ret;
    }

    serialize(): string {
        if (this.serialization) {
            return this.serialization;
        }

        let ser = "" + Symbol[this.source.data] + "(";
        for (let c of this.children) {
            ser += serialize_child(c) + ",";
        }
        ser += ")";

        this.serialization = ser;
        return ser;
    }

    get_leaves(): NTreeLeaf[] {
        if (this.leaves) {
            return this.leaves;
        }

        let lvs: NTreeLeaf[] = [];

        for (const child of this.children) {
            if (child instanceof NTree) {
                lvs.push(...child.get_leaves());
            }
            else {
                lvs.push(child);
            }
        }
        
        this.leaves = lvs;
        return lvs;
    }

    static me_ntrees: Map<string, NTree[]>;

    static seqeq(arr1: NTreeChild[], arr2: NTreeChild[]) {
        if (arr1.length !== arr2.length) {
            return false;
        }
        for (let i = 0; i < arr1.length; i++) {
            if (
                !(arr1[i] instanceof NTree) && !(arr1[i] instanceof ParseForest) && 
                !(arr2[i] instanceof NTree) && !(arr2[i] instanceof ParseForest)) {
                //both are ParseTrees
                if (!ptree_eq(arr1[i] as ParseTree, arr2[i] as ParseTree)) {
                    return false;
                }
            }
            if (arr1[i] !== arr2[i]) {
                return false;
            }
        }
        return true;
    }

    static get_ntree(src: ParseForest, kids: NTreeChild[]) {
        let newNode = new NTree(kids, src);
        let nlist: NTree[] | undefined;
        if (!this.me_ntrees) {
            this.me_ntrees = new Map<string, NTree[]>();
            nlist = undefined;
        }
        else {
            nlist = this.me_ntrees.get(newNode.serialize());
        }

        if (!nlist) {
            nlist = [];
            this.me_ntrees.set(newNode.serialize(), nlist);
        }

        for (let arr of nlist) {
            if (arr.source === src && this.seqeq(arr.children, kids)) {
                return arr;
            }
        }

        nlist.push(newNode);

        return newNode;
    }
}

export class Node {
    tree: NTree;
    cost: number;
    heuristic: number | undefined;
    diff: number | undefined;

    private constructor(tree: NTree, cost: number) {
        this.tree = tree;
        this.cost = cost;
    }

    private static nmap: Map<NTree, Node>;

    static get_or_make_node(tree: NTree, cost: number): Node {
        let n: Node | undefined;
        if (!this.nmap) {
            this.nmap = new Map<NTree, Node>();
            n = undefined;
        } else {
            n = this.nmap.get(tree);
        }

        if (!n) {
            n = new Node(tree, cost);
            this.nmap.set(tree, n);
        }

        return n;
    }

    get_diff(from: ParseTree, path: number[], leaves: Set<ParseTree>) {
        if (this.diff) {
            return this.diff;
        }
        this.diff = diff(from, path, this, leaves);
        return this.diff;
    }
}

function serialize_child(n: NTreeChild) {
    if (n instanceof ParseForest) {
        return "[" + n.start + "." + Symbol[n.data];
    }

    if (n instanceof NTree) {
        return n.serialize();
    }

    if (n.start === -1) {
        return "?"+Symbol[n.data];
    }

    return "t"+n.start+"."+Symbol[n.data];
}

function calculate_heuristic(leaves: NTreeLeaf[], prev_end: number, next_start: number){
    let starts: number[] = [next_start];
    let ends: number[] = [prev_end];
    let strict_ends: number[] = [0]


    for (let i = 0; i < leaves.length; i++) {
        if (!(leaves[i] instanceof ParseForest)) {
            if (leaves[i].start === -1) {
                strict_ends.push(strict_ends[strict_ends.length-1]??0);
            }
            else {
                let p_end = (leaves[i] as ParseTree).end;
                strict_ends.push(p_end);
            }
        }
        else {
            strict_ends.push(-1);
        }
    }
    for (let i = 0; i < leaves.length; i++) {
        if (!(leaves[i] instanceof ParseForest) && leaves[i].start !== -1) {
            let p_end = (leaves[i] as ParseTree).end;
            ends.push(p_end);
        }
        else {
            ends.push(ends[ends.length-1]??prev_end);
        }
    }
    for (let i = leaves.length-1; i >= 0; i--) {
        if (leaves[i].start !== -1) {
            starts.unshift(leaves[i].start);
        }
        else {
            starts.unshift(starts[0] ?? next_start);
        }
    }
    let ret = 0;
    for (let i = 0; i < leaves.length; i++) {
        const leaf = leaves[i];
        if (leaf.start !== -1 && leaf.start < ends[i]) {
            return Number.MAX_SAFE_INTEGER;
        }
        if (leaf instanceof ParseForest) {
            ret += leaf.get_sub_heurisic(ends[i], starts[i+1]);
        }
        else {
            if (leaf.start === -1) {
                ret += 1;
            }
            else {
                if (ends[i] <= leaf.start && starts[i+1] >= leaf.end) {
                    if (starts[i+1] !== next_start && starts[i+1] !== leaf.end) {
                        return Number.MAX_SAFE_INTEGER;
                    } 
                    if (strict_ends[i] !== -1) {
                        if (leaves[i].start !== -1 && (leaves[i] as ParseTree).start !== strict_ends[i]) {
                            return Number.MAX_SAFE_INTEGER;
                        }
                    }
                }
                else {
                    return Number.MAX_SAFE_INTEGER;
                }
            }
        }
    }
    return ret;
}


function get_edges(n: Node, len: number): Node[] {

    let ancestry: [NTree, number][] = [];
    let accum: Node[] = [];
    let originalNode = n;

    let index = 0;


    let edge_context: Map<ParseForest,Map<ParseForest,number>> = new Map();

    function has_conversion(symbol: Symbol) {
        let i = ancestry.length - 1;
        while (i >= 0) {
            for (let ii = 0; ii < ancestry[i][0].children.length; ii++) {
                let looking_at = ancestry[i][0].children[ii];
                if (ii !== ancestry[i][1]) {
                    if (looking_at instanceof NTree || looking_at instanceof ParseForest) {
                        return false;
                    }
                    if (looking_at.start !== -1) {
                        return false;
                    }
                }
            }
            if ((ancestry[i][0] as NTree).source.data === symbol) {
                return true;
            }
            i--;
        }
        return false;
    }

    function dfs(n: NTree): boolean {
        let i = -1;
        for (const child of n.children) {
            i++;
            if (child instanceof NTree) {
                let edge_map = edge_context.get(n.source);
                if (!edge_map) {
                    edge_map = new Map();
                    edge_context.set(n.source,edge_map);
                }
                edge_map.set(child.source,(edge_map.get(child.source)??0) + 1)
                ancestry.push([n,i]);
                if (dfs(child) === false) {
                    return false;
                }
                edge_map.set(child.source,(edge_map.get(child.source)??1) - 1)
                ancestry.pop();
                continue;
            }
            
            if (child instanceof ParseForest) {
                if (!has_conversion(originalNode.tree.get_leaves()[index].data)) {
                    let res = child.get_n_trees(edge_context);
                    for (const new_leaves of res) {
                        let all_imagined = !new_leaves.some(leaf=>leaf.start!==-1);
                        if (all_imagined) {
                            continue;
                        }
                        let new_n_tree = NTree.get_ntree(child,new_leaves);

                        let new_childs = n.children.map((x) => x);
                        new_childs[i] = new_n_tree;
                        new_n_tree = NTree.get_ntree(n.source, new_childs);
                        
                        for (let j = ancestry.length - 1; j >= 0; j--) {
                            const parent = ancestry[j][0];
                            let ii = ancestry[j][1]; 
                            let new_new_childs = parent.children.map((x) => x);
                            new_new_childs[ii] = new_n_tree;
                            new_n_tree = NTree.get_ntree(parent.source, new_new_childs);
                        }

                        let cost = originalNode.cost;

                        let node = Node.get_or_make_node(new_n_tree, cost);
                        if (!node.heuristic) {
                            let new_node_leaves = originalNode.tree.get_leaves().map(x=>x);
                            new_node_leaves.splice(index,1,...new_leaves);
                            node.heuristic = calculate_heuristic(new_node_leaves,0,len);
                        }
                        if (node.heuristic < Number.MAX_SAFE_INTEGER) {
                            accum.push(node);
                        }
                    }
                }
            }
            index++;
        }
        return true;
    }
    
    
    dfs(n.tree);
    return accum;
}

function is_solution(n: Node, len: number): boolean {
    let tot = 0;
    
    for (const leaf of n.tree.get_leaves()) {
        if (leaf instanceof ParseForest || leaf instanceof NTree) {
            return false;
        }
        
        if (leaf.start !== -1 && leaf.data !== Symbol.epsilon) {
            tot++;
        }
    }
    return tot === len;
}

function diff(before: ParseTree, path: number[], next: Node, leaves: Set<ParseTree>) {
    function compare(b: ParseTree, n: NTreeChild, skip: number) {
        if (n instanceof NTree) {
            if (leaves.has(b)) {
                return false;
            }
            if (n.data !== b.data || n.variant !== b.variant) {
                return false;
            }
            if (n.children.length !== b.children.length) {
                return false;
            }
            for (let i = 0; i < n.children.length; i++){
                if (i !== skip && !compare(b.children[i],n.children[i],-1)){
                    return false;
                }
            }
            return true;
        }
        if (n instanceof ParseForest) {
            if (leaves.has(b)) {
                return false;
            }
            if (n.data !== b.data || n.variant !== b.variant) {
                return false;
            }
            return true;
        }
        return ptree_eq(b,n);
    }
    let before_l = before;
    let next_l: NTreeChild = next.tree;
    const max_diff = path.length;
    for (let i = 0; i < path.length-1; i++) {
        if (!compare(before_l,next_l,path[i])) {
            return max_diff - i;
        }
        if (next_l instanceof ParseForest) {
            if (next_l.data === before_l.data && next_l.variant === before_l.variant) {
                return 0;
            }
            return max_diff - i;
        }
        before_l = before_l.children[path[i]];
        next_l = next_l.children[path[i]];
    }
    return 0;
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

export function solve(start_forests: ParseForest[], len: number, before: ParseTree, target: ParseTree, leaves: Set<ParseTree>) : ParseTree[] {
    let path = make_path(target);
    let nodes: Node[] = [];
    for (const forest of start_forests) {
        let possible_children = forest.get_n_trees( new Map());
        for (const n_trees of possible_children) {
            let heuristic = calculate_heuristic(n_trees,0,Number.MAX_SAFE_INTEGER);

            let n_tree = NTree.get_ntree(forest, n_trees);
            let node = Node.get_or_make_node(n_tree, 0);
            if (!node.heuristic) {
                node.heuristic = heuristic;
                nodes.push(node);
            }
        }
    }

    let ret = search(nodes, len, before, path, leaves);
    if (ret) {
        return [node_to_parse_tree(ret)];
    }
    return [];
}

function node_to_parse_tree(node: Node): ParseTree {
    function ntree_to_parse_tree(tree: NTreeChild): ParseTree {
        if (tree instanceof NTree) {
            return {
                data: tree.source.data,
                children: tree.children.map(ntree_to_parse_tree),
                start: 0,
                end: 0,
                num_imagined: 0,
                variant: tree.source.variant,
            }
        }
        if (tree instanceof ParseForest) { 
            throw new Error("can't convert node to parse tree if it contains parse forest");
        }
        return ptree_shallow(tree);
        
    }
    return ntree_to_parse_tree(node.tree);
}


function search(start: Node[], len: number, before: ParseTree, path: number[], leaves: Set<ParseTree>): Node | undefined {
    let pq = new PriorityQueue<Node>({
        comparator: (a, b) => {
            if (a.heuristic! !== b.heuristic) {
                return a.heuristic! - b.heuristic!;
            }
            return a.get_diff(before, path, leaves) - b.get_diff(before, path, leaves);
        }
    });

    let visited: Set<Node> = new Set<Node>();

    for (let n of start) {
        pq.queue(n);
        visited.add(n);
    }

    while (pq.length > 0) {
        let dq = pq.dequeue();

        if (is_solution(dq, len)) {
            return dq;
        }

        let childs = get_edges(dq, len);

        for (let c of childs) {
            if (!visited.has(c)) {
                visited.add(c);
                pq.queue(c);
            }
        }
    }

    return undefined;
}