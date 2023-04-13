//This is a generated file
//do not edit (please)

export enum Symbol {
  a,
  b,
  c,
  unknown,
  d,
  S,
  A,
  B,
  C,
  D,
  E,
};

export const grammar_start = Symbol.S;

export const regexes = [
  new RegExp('^[0-9]+'),
  new RegExp('^b'),
  new RegExp('^c'),
  new RegExp('^d'),
];

export const defaults = [
  '',
  'b',
  'c',
  'd',
]

export type Rule = {
  lhs: Symbol;
  rhs: Symbol[];
  names: string[];
  variant: number;
}

export const grammar: Rule[][] = [
  [ //S
    {lhs: Symbol.S, 
        rhs: [Symbol.A, Symbol.C],
        names: ["", ""],
        variant: 0,
      },
  ], 
  [ //A
    {lhs: Symbol.A, 
        rhs: [Symbol.A, Symbol.B],
        names: ["", ""],
        variant: 0},
    {lhs: Symbol.A, 
        rhs: [],
        names: [""],
        variant: 1},
  ],
  [ //B
    {lhs: Symbol.B, 
        rhs: [Symbol.a],
        names: [""],
        variant: 0},
    {lhs: Symbol.B, 
        rhs: [Symbol.b],
        names: [""],
        variant: 1},
  ],
  [ //C
    {lhs: Symbol.C, 
        rhs: [Symbol.c],
        names: [""],
        variant: 0},
  ],
  [ //D
    {lhs: Symbol.D, 
        rhs: [Symbol.c],
        names: [""],
        variant: 0},
  ],
  [ //E
    {lhs: Symbol.E, 
        rhs: [Symbol.A, Symbol.B, Symbol.C],
        names: ["", "", ""],
        variant: 0,
      },
    {lhs: Symbol.E, 
        rhs: [Symbol.A, Symbol.D],
        names: ["", ""],
        variant: 1,
      },
  ], 
]

const list_tbl: boolean[] = [
  false,
  true,
  false,
  false,
  false,
  false,
]

export function is_list(s: Symbol) {
  if (is_term(s)) {
    return false;
  }
  return list_tbl[s - grammar_start];
}


export function is_term(s: Symbol){
  return s <= Symbol.unknown;
}