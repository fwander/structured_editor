import { ParseForest } from "./parse";
import { NTree, NTreeChild } from "./parse_searcher";

function traverse(tree: NTreeChild, sequence: NTreeChild[], leftmostLeafDescendants: number[], first: boolean, leavesSet: Set<NTreeChild>): number {
  let minDescendant = sequence.length;

  if (!first && leavesSet.has(tree) || tree instanceof ParseForest) {
    sequence.push(tree);
    leftmostLeafDescendants.push(minDescendant);
    return minDescendant;
  }
  else if (!(tree instanceof ParseForest)) {
    for (const child of tree.children) {
      const descendant = traverse(child, sequence, leftmostLeafDescendants, first, leavesSet);
      minDescendant = Math.min(minDescendant, descendant);
    }
    if (first && !(tree instanceof NTree)) {
      leavesSet?.add(tree);
    }
  } 


  return minDescendant;
}


export function zhangShasha(tree1: NTreeChild, tree2: NTreeChild): number {
  const sequence1: NTreeChild[] = [];
  const sequence2: NTreeChild[] = [];
  const leftmostLeafDescendants1: number[] = [];
  const leftmostLeafDescendants2: number[] = [];
  const leavesSet: Set<NTreeChild> = new Set();

  traverse(tree1, sequence1, leftmostLeafDescendants1, true, leavesSet);
  traverse(tree2, sequence2, leftmostLeafDescendants2, false, leavesSet);


  const n = sequence1.length;
  const m = sequence2.length;
  const costMatrix: number[][] = new Array(n + 1).fill(null).map(() => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    costMatrix[i][0] = costMatrix[i - 1][0] + 1;
  }

  for (let j = 1; j <= m; j++) {
    costMatrix[0][j] = costMatrix[0][j - 1] + 1;
  }
  for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
      const deleteCost = costMatrix[i - 1][j] + 1;
      const insertCost = costMatrix[i][j - 1] + 1;
  
      let updateCost;
      if (sequence1[i - 1] === sequence2[j - 1] || (sequence1[i - 1].data === sequence2[j - 1].data && sequence1[i - 1].variant === sequence2[j - 1].variant)) {
          updateCost = costMatrix[i - 1][j - 1];
      } else {
          updateCost = costMatrix[i - 1][j - 1] + 1;
      }
  
      const l1 = leftmostLeafDescendants1[i - 1];
      const l2 = leftmostLeafDescendants2[j - 1];
  
      let subTreeCost = 0;
  
      if (l1 === l2) {
          for (let k = l1; k < i; k++) {
          for (let l = l2; l < j; l++) {
              if (
                !(sequence1[k] instanceof ParseForest) && 
                !(sequence2[l] instanceof ParseForest)
              ) {
                subTreeCost += costMatrix[k][l];
              }
              else {
                if (
                  !(sequence1[k].data === sequence2[l].data && sequence1[k].variant === sequence2[l].variant) 
                )
                {
                  subTreeCost += 1;
                }
              }
          }
          }
      }
  
      costMatrix[i][j] = Math.min(deleteCost, insertCost, updateCost + subTreeCost);
      }
  }
  return costMatrix[n][m];
}
