import { ParseTree } from "./parse";

export function parse_tree_to_data(tree: ParseTree): any {
    if (tree.render_info && tree.render_info.ast) {
        return tree.render_info.ast;
    }
    if (tree.children.length === 0) {
        return tree.token? tree.token : "";
    }
    if (tree.children.length === 1) {
        return parse_tree_to_data(tree.children[0]);
    }
    return [...tree.children.map(parse_tree_to_data)];
}

export class AST {
    private data: ParseTree;
    constructor(data: ParseTree) {
        console.log("hello from a new AST!!!");
        if (!data) {
            console.log("Undef data :(");
        }
        this.data = data;
    }
    protected get_data(): ParseTree {
        return this.data;
    }
    children() {
        return parse_tree_to_data(this.data);
    }
}