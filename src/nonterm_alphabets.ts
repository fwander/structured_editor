import { grammar, Symbol, is_term } from "./gen/grammar";
import HashSet from "./HashSet"
import { RecognizerItem } from "./parse";

let symbol_alphabets: {[x: string]: HashSet<Symbol>};

export function get_alphabet(sym: Symbol): HashSet<Symbol> {
    let sym_alph = get_alphabet_sets();
    let k = sym_alph[Symbol[sym]];
    if (k) return k;
    return sym_alph[Symbol[sym]] = new HashSet<Symbol>((x) => Symbol[x]).add(sym);
}

function get_alphabet_sets() {
    if (symbol_alphabets) return symbol_alphabets;
    
    return symbol_alphabets = build_alphabets();
}

function build_alphabets() {
    // Build initial alphabets
    let map: {[x: string]: HashSet<Symbol>} = {};
    for (let sym_rules of grammar) {
        let hashset: HashSet<Symbol> = new HashSet<Symbol>((x) => Symbol[x]);
        let lhs: string = Symbol[0];
        for (let rule of sym_rules) {
            lhs = Symbol[rule.lhs];
            for (let rhs_sym of rule.rhs) {
                hashset.add(rhs_sym);
            }
        }

        map[lhs] = hashset;
    }

    // Fixed point iteration

    let totalCount: number = 1;
    let oldCount: number = 0;

    while (totalCount !== oldCount) {
        oldCount = totalCount;
        totalCount = 0;

        for (let set of Object.values(map)) {
            let arr: Symbol[] = set.to_array();
            totalCount += arr.length;
            for (const val of arr) {
                if (!is_term(val)) {
                    set.union(map[Symbol[val]]);
                }
            }
        }
    }

    return map;
}