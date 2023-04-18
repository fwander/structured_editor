//This is a generated file
//do not edit (please)

export enum Symbol {
    
  token0,
  
  token1,
  
  token2,
  
  token3,
  
  token4,
  
  token5,
  
  token6,
  
  token7,
  
  token8,
  
  unknown,
  
  S,
  
  S_0,
  
  S_4,
  
  expr,
  
  expr_3,
  
  expr_6,
  
  keyword_1,
  
  op,
  
};

export const grammar_start = Symbol.S;

export const regexes = [
  
  /^;/,
  
  /^[0-9]+/,
  
  /^\(/,
  
  /^\)/,
  
  /^rect/,
  
  /^circle/,
  
  /^rotate/,
  
  /^transform/,
  
  /^[a-zA-Z]+/,
  
];

export const defaults = [
  
  ';',
  
  '',
  
  '\(',
  
  '\)',
  
  'rect',
  
  'circle',
  
  'rotate',
  
  'transform',
  
  '',
  
]

export type Rule = {
  lhs: Symbol;
  rhs: Symbol[];
  names: string[];
  variant: number;
}

export const grammar: Rule[][] = [
  
  [ // S
    
      {lhs: Symbol.S,
      rhs: [
        
        Symbol.S_0,
        
      ],
      names: [
        
        "",
        
      ],
      variant: 0,},
    
  ],
  
  [ // S_0
    
      {lhs: Symbol.S_0,
      rhs: [
        
        Symbol.S_0,
        
        Symbol.S_4,
        
      ],
      names: [
        
        "",
        
        "horiz",
        
      ],
      variant: 0,},
    
      {lhs: Symbol.S_0,
      rhs: [
        
      ],
      names: [
        
      ],
      variant: 1,},
    
  ],
  
  [ // S_4
    
      {lhs: Symbol.S_4,
      rhs: [
        
        Symbol.expr,
        
        Symbol.token0,
        
      ],
      names: [
        
        "",
        
        "",
        
      ],
      variant: 0,},
    
  ],
  
  [ // expr
    
      {lhs: Symbol.expr,
      rhs: [
        
        Symbol.expr_3,
        
      ],
      names: [
        
        "",
        
      ],
      variant: 0,},
    
      {lhs: Symbol.expr,
      rhs: [
        
        Symbol.token1,
        
      ],
      names: [
        
        "",
        
      ],
      variant: 1,},
    
  ],
  
  [ // expr_3
    
      {lhs: Symbol.expr_3,
      rhs: [
        
        Symbol.token2,
        
        Symbol.op,
        
        Symbol.expr_6,
        
        Symbol.token3,
        
      ],
      names: [
        
        "",
        
        "",
        
        "",
        
        "",
        
      ],
      variant: 0,},
    
  ],
  
  [ // expr_6
    
      {lhs: Symbol.expr_6,
      rhs: [
        
        Symbol.expr_6,
        
        Symbol.expr,
        
      ],
      names: [
        
        "",
        
        "",
        
      ],
      variant: 0,},
    
      {lhs: Symbol.expr_6,
      rhs: [
        
      ],
      names: [
        
      ],
      variant: 1,},
    
  ],
  
  [ // keyword_1
    
      {lhs: Symbol.keyword_1,
      rhs: [
        
        Symbol.token4,
        
      ],
      names: [
        
        "",
        
      ],
      variant: 0,},
    
      {lhs: Symbol.keyword_1,
      rhs: [
        
        Symbol.token5,
        
      ],
      names: [
        
        "",
        
      ],
      variant: 1,},
    
      {lhs: Symbol.keyword_1,
      rhs: [
        
        Symbol.token6,
        
      ],
      names: [
        
        "",
        
      ],
      variant: 2,},
    
      {lhs: Symbol.keyword_1,
      rhs: [
        
        Symbol.token7,
        
      ],
      names: [
        
        "",
        
      ],
      variant: 3,},
    
  ],
  
  [ // op
    
      {lhs: Symbol.op,
      rhs: [
        
        Symbol.keyword_1,
        
      ],
      names: [
        
        "keyword",
        
      ],
      variant: 0,},
    
      {lhs: Symbol.op,
      rhs: [
        
        Symbol.token8,
        
      ],
      names: [
        
        "",
        
      ],
      variant: 1,},
    
  ],
  
]


const list_tbl: boolean[] = [
  
  false,
  
  true,
  
  false,
  
  false,
  
  false,
  
  true,
  
  false,
  
  false,
  
];

export function is_list(s: Symbol) {
  if (is_term(s)) {
    return false;
  }
  return list_tbl[s - grammar_start];
}


export function is_term(s: Symbol){
  return s <= Symbol.unknown;
}
