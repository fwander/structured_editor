import { is_list } from "./gen/grammar";
import { ParseTree, ptree_str } from "./parse";

function move_to_bottom(from: ParseTree, go_first?: number) {
    let passed_in = go_first;
    while (from && from.render_info && (from.children.length === 1 || (is_list(from.data) && from.children.length !== 0 && (from.render_info.parent && from.render_info.parent.data === from.data)))) {
        if (passed_in === -1) {
            go_first = from.children.length-1;
        }
        from = from.children[go_first ? go_first : from.render_info.last_selected];
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

function adj_cousin(from: ParseTree, is_next: boolean): [ParseTree, ParseTree] {
    let orig = from;
    let levels: number = 0;
    let cont: boolean = true;
    while (cont) {
        cont = false;
        if (from.render_info && !from.render_info.parent) {
            return [orig, from];
        }

        let next_sib = is_next ? next_sibling(from) : prev_sibling(from);
        if (next_sib === from) {
            cont = true;
            levels++;
            from = parent(from);
        } else {
            from = next_sib;
        }
    }
    let lca = from;

    let ind = is_next ? 0 : -1;
    let last_from = from;
    for (let i = 0; i < levels; i++) {
        from = child(from, ind);
        if (!from) {
            return [last_from,lca];
        }
        last_from = from;
    }

    return [from, lca];
}

export function lca_nav_right(from: ParseTree): [ParseTree, number, ParseTree, number] {
    let [prev, lca] = adj_cousin(from, true);
    let distance_to_cur = 0;
    let looking_at = from;
    while (looking_at.render_info?.parent) {
        looking_at = looking_at.render_info.parent;
        distance_to_cur++;
        if (looking_at === lca) {
            break;
        }
    }
    let distance_to_prev = 0;
    looking_at = prev;
    while (looking_at.render_info?.parent) {
        looking_at = looking_at.render_info.parent;
        distance_to_prev++;
        if (looking_at === lca) {
            break;
        }
    }
    return [prev, distance_to_prev, lca, distance_to_cur];
}
export function lca_nav_left(from: ParseTree): [ParseTree, number, ParseTree, number] {
    let [prev, lca] = adj_cousin(from, false);
    let distance_to_cur = 0;
    let looking_at = from;
    while (looking_at.render_info?.parent) {
        looking_at = looking_at.render_info.parent;
        distance_to_cur++;
        if (looking_at === lca) {
            break;
        }
    }
    let distance_to_prev = 0;
    looking_at = prev;
    while (looking_at.render_info?.parent) {
        looking_at = looking_at.render_info.parent;
        distance_to_prev++;
        if (looking_at === lca) {
            break;
        }
    }
    return [prev, distance_to_prev, lca, distance_to_cur];
}

export function nav_right(from: ParseTree): ParseTree {
    let [ret, _] = adj_cousin(from, true);
    return ret;
}
export function nav_left(from: ParseTree): ParseTree {
    let [ret, _] = adj_cousin(from, false);
    return ret;
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

export function child(from: ParseTree, go_first?: number) {
    if (!from.render_info) {
        return from;
    }
    if (from.children.length === 0) {
        return from;
    }

    let ind = from.render_info!.last_selected;
    if (go_first) {
        if (go_first === -1) {
            go_first = from.children.length-1;
        }
        ind = go_first;
    }
    return move_to_bottom(from.children[ind], go_first);
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
    return n.children.length === 0 && (n.token === undefined || n.token.length === 0);
}
