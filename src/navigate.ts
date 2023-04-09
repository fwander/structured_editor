import { ParseTree } from "./parse";

function next_sibling(from: ParseTree) {
    if (!from.render_info) {
        return from;
    }
}

function parent(from: ParseTree) {
    if (!from.render_info) {
        return from;
    }
    if (!from.render_info.parent) {
        return from;
    }
    from.render_info!.parent!.render_info!.last_selected = from.render_info.parent.children.indexOf(from);
    return from.render_info.parent;
}

function child(from: ParseTree) {
    if (!from.render_info) {
        return from;
    }
    return ;
}