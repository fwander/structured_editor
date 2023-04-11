import { is_list } from "./gen/grammar";
import { ParseTree } from "./parse";

function move_to_bottom(from: ParseTree) {
    while (from && from.render_info && (from.children.length === 1 || (is_list(from.data) && from.children.length !== 0 && (from.render_info.parent && from.render_info.parent.data === from.data)))) {
        from = from.children[from.render_info.last_selected];
    }

    return from;
}

function move_to_top(from: ParseTree) {
    while (from.render_info && from.render_info.parent && (from./*render_info.parent.*/children.length === 1 || (is_list(from.render_info.parent.data) && from.render_info.parent.data === from.data))) {
        from.render_info!.parent!.render_info!.last_selected = from.render_info.parent.children.indexOf(from);
        from = from.render_info.parent;
    }

    return from;
}

function move_to_top_of_single_child_chain_only(from: ParseTree) {
    while (from.render_info && from.render_info.parent && from.render_info.parent.render_info && from.render_info.parent.children.length === 1) {
        from.render_info.parent.render_info.last_selected = 0;
        from = from.render_info.parent;
    }
    return from;
}

export function next_sibling(from: ParseTree) {
    from = move_to_top_of_single_child_chain_only(from);
    if (from && from.render_info && from.render_info.parent && from.render_info.parent.children.length === 2 && from.render_info.parent.children[1] === from && from.render_info.parent.render_info && from.render_info.parent.render_info.parent && is_list(from.render_info.parent.data) && from.render_info.parent.data === from.render_info.parent.render_info.parent.data) {
        from = from.render_info.parent.render_info.parent;
        from = from.children[from.children.length - 1];
    }
    else {
        from = mov_sibling(from, 1);
    }

    return move_to_bottom(from);
}

function mov_sibling(from: ParseTree, delta: number) {
    if (!from.render_info) {
        return from;
    }

    const parent = from.render_info.parent
    if (!parent) {
        return from;
    }
    let ind = parent.children.indexOf(from) + delta;
    const length = parent.children.length;
    if (ind >= length) {
        if (parent.render_info) {
            parent.render_info.last_selected = length - 1;
        }
        return parent.children[length - 1];
    }

    if (ind < 0) {
        if (parent.render_info) {
            parent.render_info.last_selected = 0;
        }
        return parent.children[0];
    }


    if (parent.render_info) {
        parent.render_info.last_selected = ind;
    }

    return parent.children[ind];
}

export function prev_sibling(from: ParseTree) {
    from = mov_sibling(move_to_top_of_single_child_chain_only(from), -1);
    if (from.children.length !== 0 && from.render_info && from.render_info.parent && from.data === from.render_info.parent.data && is_list(from.data)) {
        from = from.children[from.children.length - 1];
    }
    return move_to_bottom(from);
}

export function parent(from: ParseTree) {
    if (!from.render_info) {
        return from;
    }
    if (!from.render_info.parent) {
        return from;
    }
    from.render_info!.parent!.render_info!.last_selected = from.render_info.parent.children.indexOf(from);
    return move_to_top(from.render_info.parent);
}

export function child(from: ParseTree) {
    if (!from.render_info) {
        return from;
    }
    if (from.children.length === 0) {
        return from;
    }

    let ind = from.render_info!.last_selected;
    return move_to_bottom(from.children[ind]);
}