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
    
    token9,
    
    unknown,
    
    S,
    
    S_0,
    
    S_5,
    
    expr,
    
    number,
    
    op,
    
    opexpr,
    
    opexpr_4,
    
    keyword,
    
    keyword_2,
    
    id,
    
    color,
    
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
    
    /^translate/,
    
    /^[a-z]+/,
    
    /^[A-Z]+/,
    
  ];
  
  export const defaults = [
    
    ';',
    
    '',
    
    '\(',
    
    '\)',
    
    'rect',
    
    'circle',
    
    'rotate',
    
    'translate',
    
    '',
    
    '',
    
  ]
  
  export type Rule = {
    lhs: Symbol;
    rhs: Symbol[];
    names: string[];
    breaks: number[];
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
        breaks: [
          
          1,
          
        ],
        variant: 0,},
      
    ],
    
    [ // S_0
      
        {lhs: Symbol.S_0,
        rhs: [
          
          Symbol.S_0,
          
          Symbol.S_5,
          
        ],
        names: [
          
          "",
          
          "",
          
        ],
        breaks: [
          
          2,
          
        ],
        variant: 0,},
      
        {lhs: Symbol.S_0,
        rhs: [
          
        ],
        names: [
          
        ],
        breaks: [
          
          0,
          
        ],
        variant: 1,},
      
    ],
    
    [ // S_5
      
        {lhs: Symbol.S_5,
        rhs: [
          
          Symbol.expr,
          
          Symbol.token0,
          
        ],
        names: [
          
          "",
          
          "",
          
        ],
        breaks: [
          
          2,
          
          2,
          
        ],
        variant: 0,},
      
    ],
    
    [ // expr
      
        {lhs: Symbol.expr,
        rhs: [
          
          Symbol.opexpr,
          
        ],
        names: [
          
          "",
          
        ],
        breaks: [
          
          1,
          
        ],
        variant: 0,},
      
        {lhs: Symbol.expr,
        rhs: [
          
          Symbol.number,
          
        ],
        names: [
          
          "",
          
        ],
        breaks: [
          
          1,
          
        ],
        variant: 1,},
      
        {lhs: Symbol.expr,
        rhs: [
          
          Symbol.color,
          
        ],
        names: [
          
          "",
          
        ],
        breaks: [
          
          1,
          
        ],
        variant: 2,},
      
    ],
    
    [ // number
      
        {lhs: Symbol.number,
        rhs: [
          
          Symbol.token1,
          
        ],
        names: [
          
          "",
          
        ],
        breaks: [
          
          1,
          
        ],
        variant: 0,},
      
    ],
    
    [ // op
      
        {lhs: Symbol.op,
        rhs: [
          
          Symbol.keyword,
          
        ],
        names: [
          
          "",
          
        ],
        breaks: [
          
          1,
          
        ],
        variant: 0,},
      
        {lhs: Symbol.op,
        rhs: [
          
          Symbol.id,
          
        ],
        names: [
          
          "",
          
        ],
        breaks: [
          
          1,
          
        ],
        variant: 1,},
      
    ],
    
    [ // opexpr
      
        {lhs: Symbol.opexpr,
        rhs: [
          
          Symbol.token2,
          
          Symbol.op,
          
          Symbol.opexpr_4,
          
          Symbol.token3,
          
        ],
        names: [
          
          "",
          
          "",
          
          "",
          
          "",
          
        ],
        breaks: [
          
          4,
          
        ],
        variant: 0,},
      
    ],
    
    [ // opexpr_4
      
        {lhs: Symbol.opexpr_4,
        rhs: [
          
          Symbol.opexpr_4,
          
          Symbol.expr,
          
        ],
        names: [
          
          "",
          
          "",
          
        ],
        breaks: [
          
          2,
          
        ],
        variant: 0,},
      
        {lhs: Symbol.opexpr_4,
        rhs: [
          
        ],
        names: [
          
        ],
        breaks: [
          
          0,
          
        ],
        variant: 1,},
      
    ],
    
    [ // keyword
      
        {lhs: Symbol.keyword,
        rhs: [
          
          Symbol.keyword_2,
          
        ],
        names: [
          
          "keyword",
          
        ],
        breaks: [
          
          1,
          
        ],
        variant: 0,},
      
    ],
    
    [ // keyword_2
      
        {lhs: Symbol.keyword_2,
        rhs: [
          
          Symbol.token4,
          
        ],
        names: [
          
          "",
          
        ],
        breaks: [
          
          1,
          
        ],
        variant: 0,},
      
        {lhs: Symbol.keyword_2,
        rhs: [
          
          Symbol.token5,
          
        ],
        names: [
          
          "",
          
        ],
        breaks: [
          
          1,
          
        ],
        variant: 1,},
      
        {lhs: Symbol.keyword_2,
        rhs: [
          
          Symbol.token6,
          
        ],
        names: [
          
          "",
          
        ],
        breaks: [
          
          1,
          
        ],
        variant: 2,},
      
        {lhs: Symbol.keyword_2,
        rhs: [
          
          Symbol.token7,
          
        ],
        names: [
          
          "",
          
        ],
        breaks: [
          
          1,
          
        ],
        variant: 3,},
      
    ],
    
    [ // id
      
        {lhs: Symbol.id,
        rhs: [
          
          Symbol.token8,
          
        ],
        names: [
          
          "",
          
        ],
        breaks: [
          
          1,
          
        ],
        variant: 0,},
      
    ],
    
    [ // color
      
        {lhs: Symbol.color,
        rhs: [
          
          Symbol.token9,
          
        ],
        names: [
          
          "",
          
        ],
        breaks: [
          
          1,
          
        ],
        variant: 0,},
      
    ],
    
  ]

  
  const list_tbl: boolean[] = [
    
    false,
    
    true,
    
    false,
    
    false,
    
    false,
    
    false,
    
    false,
    
    true,
    
    false,
    
    false,
    
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