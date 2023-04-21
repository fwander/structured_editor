import { Symbol } from "./gen/grammar";
import { ParseForest, ParseTree } from "./parse"
import PriorityQueue from "ts-priority-queue";

export type NTreeChild = NTree | ParseForest | ParseTree;
export type NTreeLeaf = ParseForest | ParseTree;

export class NTree {
    source: ParseForest;
    children: NTreeChild[];
    serialization: string | undefined;
    leaves: NTreeLeaf[] | undefined;
    variant: number;

    private constructor(kids: NTreeChild[], src: ParseForest, variant: number) {
        this.children = kids;
        this.source = src;
        this.variant = variant;
        this.serialize();
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
            if (arr1[i] !== arr2[i]) {
                return false;
            }
        }
        return true;
    }

    static get_ntree(variant: number, src: ParseForest, kids: NTreeChild[]) {
        let newNode = new NTree(kids, src, variant);
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
            if (this.seqeq(arr.children, kids)) {
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
}

function serialize_child(n: NTreeChild) {
    if (n instanceof ParseForest) {
        return "[" + Symbol[n.data];
    }

    if (n instanceof NTree) {
        return n.serialize();
    }

    return "t"+Symbol[n.data];
}


function get_edges(n: Node): Node[] {

    let ancestry: [NTree, number][] = [];
    let accum: Node[] = [];
    let prev_end = 0;
    let next_start = Infinity;
    let originalNode = n;

    let starts: number[] = [];
    let ends: number[] = [];
    let leaves = n.tree.get_leaves();

    for (let i = 0; i < leaves.length; i++) {
        if (!(leaves[i] instanceof ParseForest)) {
            ends.push((leaves[i] as ParseTree).end);
        }
        else {
            ends.push(ends[ends.length-1]??0);
        }
    }
    for (let i = leaves.length-1; i >= 0; i--) {
        if (!(leaves[i] instanceof ParseForest)) {
            starts.unshift((leaves[i] as ParseTree).start);
        }
        else {
            starts.unshift(starts[0] ?? Infinity)
        }
    }
    let index = 0;

    function delta_heuristic(from: ParseForest, to: NTreeLeaf[], leaves: NTreeLeaf[], index: number, starts: number[], ends: number[]) {
        let old_h = from.get_sub_heurisic(ends[index], starts[index]);
        let delta = -(old_h + 1);

        if (to.length === 1) {
            if (to[0].start !== -1) {
                let ind = index - 1;
                let looking_at = leaves[ind];
                while (looking_at && (looking_at instanceof ParseForest || looking_at.start === -1)) {
                    if (looking_at instanceof ParseForest) {
                        let old_h_l = looking_at.get_sub_heurisic(ends[ind],starts[ind]);
                        let new_h = looking_at.get_sub_heurisic(ends[ind],to[0].start);
                        delta += (new_h - old_h_l);
                    }
                    ind--;
                    looking_at = leaves[ind];
                }
                ind = index + 1;
                looking_at = leaves[ind];
                while (looking_at && (looking_at instanceof ParseForest || looking_at.start === -1)) {
                    if (looking_at instanceof ParseForest) {
                        let old_h_l = looking_at.get_sub_heurisic(ends[ind],starts[ind]);
                        let new_h = looking_at.get_sub_heurisic(ends[ind],to[0].start);
                        delta += (new_h - old_h_l);
                    }
                    ind++;
                    looking_at = leaves[ind];
                }
            }
        }
        else { // pls look over i beg of thee
            delta += to.length;
            for (let omega = 0; omega < to.length; omega++) {
                let this_one = to[omega];
                if (this_one instanceof ParseForest) {
                    delta += this_one.get_sub_heurisic(ends[index], starts[index]);
                } else {
                    throw new Error("get_n_trees returned invalid result");
                }
            }
        }
        return delta;
        
    }

    let edge_context: Map<ParseForest,Map<ParseForest,number>> = new Map();

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
                let res = child.get_n_trees(ends[index],starts[index],edge_context);
                for (const new_leaves of res) {
                    if (new_leaves.length === 0) {
                        // kill EVERYTHING with FIRE
                        accum = [];
                        return false;
                    }

                    let new_n_tree: NTree;

                    let new_childs: NTreeChild[];
                    if (new_leaves.length === 1 && !(new_leaves[0] instanceof ParseForest)) {
                        new_childs = n.children.map((x) => x);
                        new_childs[i] = new_leaves[0];
                        new_n_tree = NTree.get_ntree(child.variant,n.source, new_childs);
                    }
                    else {
                        new_n_tree = NTree.get_ntree(child.variant,child,new_leaves);

                        new_childs = n.children.map((x) => x);
                        new_childs[i] = new_n_tree;
                        new_n_tree = NTree.get_ntree(child.variant,n.source, new_childs);
                    }
                    
                    for (let j = ancestry.length - 1; j >= 0; j--) {
                        const parent = ancestry[j][0];
                        let ii = ancestry[j][1]; // off by one?
                        let new_new_childs = parent.children.map((x) => x);
                        new_new_childs[ii] = new_n_tree;
                        new_n_tree = NTree.get_ntree(child.variant,parent.source, new_new_childs);
                    }

                    let imagined = false;

                    if (new_leaves.length === 1 && new_leaves[0].start === -1) {
                        imagined = true;
                    }

                    let node = Node.get_or_make_node(new_n_tree, originalNode.cost + (imagined ? 2 : 1));
                    if (!node.heuristic) {
                        node.heuristic = originalNode.heuristic! + delta_heuristic(child,new_leaves,leaves,index,starts,ends);
                    }

                    accum.push(node);
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

export function solve(start_forests: ParseForest[], len: number) : ParseTree[] {
    let nodes: Node[] = [];
    for (const forest of start_forests) {
        let possible_children = forest.get_n_trees(0, Infinity, new Map());
        for (const n_trees of possible_children) {
            let heuristic = 0;
            
            for (const leaf of n_trees) {
                if (leaf instanceof ParseForest) {
                    heuristic += 1 + leaf.get_sub_heurisic(0, Infinity);
                }
                else {
                    throw new Error("Goofy goober!");
                }
            }

            let n_tree = NTree.get_ntree(forest.variant, forest, n_trees);
            let node = Node.get_or_make_node(n_tree, 0);
            if (!node.heuristic) {
                node.heuristic = heuristic;
                nodes.push(node);
            }
        }
    }

    let ret = search(nodes, len);
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
                variant: tree.variant,
            }
        }
        if (tree instanceof ParseForest) { 
            throw new Error("can't convert node to parse tree if it contains parse forest");
        }
        return tree;
        
    }
    return ntree_to_parse_tree(node.tree);
}


function search(start: Node[], len: number): Node | undefined {
    debugger;
    let pq = new PriorityQueue<Node>({
        comparator: (a, b) => {
            return a.cost + a.heuristic! - b.cost - b.heuristic!;
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

        let childs = get_edges(dq);

        for (let c of childs) {
            if (!visited.has(c)) {
                visited.add(c);
                pq.queue(c);
            }
        }
    }

    return undefined;
}