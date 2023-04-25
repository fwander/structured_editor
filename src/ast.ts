import { ParseTree } from "./parse";
import { Visitor } from "./gen/visitor";
import { is_list, is_term } from "./gen/grammar";
import { is_epsilon } from "./navigate";

export function parse_tree_to_data(tree: ParseTree): any {
    if (tree === undefined) {
        return null;
    }
    if (tree.render_info && tree.render_info.ast) {
        return tree.render_info.ast;
    }
    if (is_list(tree.data)) {
        if (tree.children.length === 0) {
            return null;
        }
        if (tree.children.length === 1) {
            return [parse_tree_to_data(tree.children[0])];
        }
        let ret = [tree.children[1]];
        let looking_at = tree.children[0];
        while (is_list(looking_at.data)) {
            if (is_epsilon(looking_at)) {
                break;
            }
            if (looking_at.children.length === 1) {
                ret.splice(0,0,looking_at.children[0]);
                break;
            }
            else if (looking_at.children.length === 2) {
                ret.splice(0,0,looking_at.children[1]);
                looking_at = looking_at.children[0];
            }
            else { // imagined non-term at end
                // ret.splice(0,0,looking_at);
                break;
            }
        }
        return [...ret.map(parse_tree_to_data)];

    }
    if (tree.children.length === 0) {
        if (!is_term(tree.data)) {
            return [];
        }
        return tree.token? tree.token : "";
    }
    if (tree.children.length === 1) {
        return parse_tree_to_data(tree.children[0]);
    }
    return [...tree.children.map(parse_tree_to_data)];
}

export abstract class AST {
    private data: ParseTree;
    constructor(data: ParseTree) {
        this.data = data;
    }
    abstract accept(v: Visitor<any, any>, env: any): any;
    protected get_data(): ParseTree {
        return this.data;
    }
    children() {
        return parse_tree_to_data(this.data);
    }
}