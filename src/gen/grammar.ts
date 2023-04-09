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
}

export const grammar: Rule[][] = [
  [ //S
    {lhs: Symbol.S, 
        rhs: [Symbol.A, Symbol.C],
        names: ["", ""]},
  ], 
  [ //A
    {lhs: Symbol.A, 
        rhs: [Symbol.A, Symbol.B],
        names: ["", ""]},
    {lhs: Symbol.A, 
        rhs: [Symbol.B],
        names: [""]},
  ],
  [ //B
    {lhs: Symbol.B, 
        rhs: [Symbol.a],
        names: [""]},
    {lhs: Symbol.B, 
        rhs: [Symbol.b],
        names: [""]},
  ],
  [ //C
    {lhs: Symbol.C, 
        rhs: [Symbol.c],
        names: [""]},
  ],
  [ //D
    {lhs: Symbol.D, 
        rhs: [Symbol.c],
        names: [""]},
  ],
  [ //E
    {lhs: Symbol.E, 
        rhs: [Symbol.A, Symbol.B, Symbol.C],
        names: ["", "", ""]},
    {lhs: Symbol.E, 
        rhs: [Symbol.A, Symbol.D],
        names: ["", ""]},
  ], 
]

export const nullable: boolean[] = [
  false,
  false,
  false,
  false,
  false,
  false,
]

export const is_list: boolean[] = [
  false,
  false,
  false,
  false,
  false,
  false,
]


export function is_term(s: Symbol){
  return s <= Symbol.unknown;
}