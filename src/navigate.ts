import { is_list } from "./gen/grammar";
import { ParseTree } from "./parse";

function move_to_bottom(from: ParseTree, go_first: boolean = false) {
    while (from && from.render_info && (from.children.length === 1 || (is_list(from.data) && from.children.length !== 0 && (from.render_info.parent && from.render_info.parent.data === from.data)))) {
        from = from.children[go_first ? 0 : from.render_info.last_selected];
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

export function next_cousin(from: ParseTree) {
    from = move_to_top_of_single_child_chain_only(from);
    let cont: boolean = true;
    let levels: number = 0;
    let ind: number = -1;
    while (cont) {
        cont = false;
        if (from.render_info && from.render_info.parent) {
            ind = from.render_info.parent.children.indexOf(from);
            if (ind === from.render_info.parent.children.length - 1) {
                cont = true;
                levels++;
                if (from.render_info.parent.render_info) {
                    from.render_info.parent.render_info.last_selected = ind;
                }
                from = move_to_top(from.render_info.parent);
            }
        }
    }
    if (ind === -1) return from;
    from = from.children[ind + 1];

    for (let i = 0; i < levels; i++) {
        from = move_to_bottom(from.children[0], true);
    }

    return from;
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
export function prev_cousin(from: ParseTree): ParseTree {
    let lca_height_from_from: number = 1;
    let prevcousin_depth_from_lca: number = 0;

    let lca: ParseTree = from.render_info!.parent!;
    let curr: ParseTree = from;
    let walk_down = first_previous_nonbox_child(lca,curr);
    while (walk_down !== null) {
        curr = lca;
        if (lca.render_info!.parent) {
            lca_height_from_from++;
            lca = lca.render_info!.parent!;
        } else {
            return from;
        }
        walk_down = first_previous_nonbox_child(lca,curr);
    }
    while (walk_down!.children.length !== 0 && prevcousin_depth_from_lca < lca_height_from_from) {
        walk_down = walk_down!.children[walk_down!.children.length-1]
        prevcousin_depth_from_lca++;
    }
    return walk_down!;
}

export function lca_prevcousin(from: ParseTree): [[ParseTree, number],[ParseTree, number]] | null {
    let lca_height_from_from: number = 1;
    let prevcousin_depth_from_lca: number = 0;

    let lca: ParseTree = from.render_info!.parent!;
    let curr: ParseTree = from;
    let walk_down = first_previous_nonbox_child(lca,curr);
    while (walk_down !== null) {
        curr = lca;
        if (lca.render_info!.parent) {
            lca_height_from_from++;
            lca = lca.render_info!.parent!;
        } else {
            return null;
        }
        walk_down = first_previous_nonbox_child(lca,curr);
    }
    while (walk_down!.children.length !== 0) {
        walk_down = walk_down!.children[walk_down!.children.length-1]
        prevcousin_depth_from_lca++;
    }
    return [[lca,lca_height_from_from],[walk_down!,prevcousin_depth_from_lca]];
}

// null when first non box child
function first_previous_nonbox_child(parent: ParseTree, child: ParseTree): ParseTree | null {
    let n: number = parent.children.indexOf(child);
    for (let i = n - 1; i >= 0; i--) {
        if (parent.children[n] === child) {
            return null;
        }
        if (!is_box(parent.children[n])) {
            return parent.children[n];
        }
    }
    return null;
}

export function is_box(n: ParseTree) {
    return n.children.length === 0 && n.token !== undefined;
}
