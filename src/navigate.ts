import { is_list } from "./gen/grammar";
import { ParseTree, ptree_str } from "./parse";

function move_to_bottom(from: ParseTree) {
    while (from && from.render_info && (from.children.length === 1 || (is_list(from.data) && from.children.length !== 0 && (from.render_info.parent && from.render_info.parent.data === from.data)))) {
        if (!from.children[from.render_info.last_selected]) {
            alert(from);
        }
        from = from.children[from.render_info.last_selected];
    }

    return from;
}

function move_to_top(from: ParseTree) {
    while (from.render_info && from.render_info.parent && (from./*render_info.parent.*/children.length === 1 || (is_list(from.render_info.parent.data) && from.render_info.parent.data === from.data))) {
        if (from.render_info.parent.children.indexOf(from) < 0) {
            console.log(from);
        }
        
        from.render_info!.parent!.render_info!.last_selected = from.render_info.parent.children.indexOf(from);
        from = from.render_info.parent;
    }

    return from;
}

// TODO: handle list properly
export function next_sibling(from: ParseTree) {
    return move_to_bottom(mov_sibling(from, 1));
}

function handle_move_next_in_list(from: ParseTree) {
    if (from && from.render_info && from.render_info.parent && from.render_info.parent.render_info) {

    }
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
    const length = parent.children.length
    if (ind >= length) {
        return parent.children[length - 1];
    }

    if (ind < 0) {
        return parent.children[0];
    }



    return parent.children[ind];
}

export function prev_sibling(from: ParseTree) {
    return move_to_bottom(mov_sibling(from, -1));
}

export function parent(from: ParseTree) {
    if (!from.render_info) {
        return from;
    }
    if (!from.render_info.parent) {
        return from;
    }
    if (from.render_info.parent.children.indexOf(from) < 0) {
        console.log(from);
    }
    from.render_info!.parent!.render_info!.last_selected = from.render_info.parent.children.indexOf(from);
    return move_to_top(from.render_info.parent);
}

export function child(from: ParseTree) {
    if (!from.render_info) {
        return from;
    }

    let ind = from.render_info!.last_selected;
    console.log(ind);
    return move_to_bottom(from.children[ind]);
}