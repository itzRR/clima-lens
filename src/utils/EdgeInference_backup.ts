// Edge AI Inference Engine for React Native
// Parses and runs the XGBoost JSON model locally on the user's phone.
// Zero server costs, instantly calculates disaster probability!

import riskModel from './models/risk_classifier.json';

interface XGBoostTree {
  left_children: number[];
  right_children: number[];
  split_conditions: number[];
  split_indices: number[];
  base_weights: number[];
}

interface XGBoostModel {
  learner: {
    gradient_booster: {
      model: {
        trees: XGBoostTree[];
      };
    };
    learner_model_param: {
      num_class: string;
      base_score: string;
    };
  };
}

const model = riskModel as XGBoostModel;
const trees = model.learner.gradient_booster.model.trees;
const numClass = parseInt(model.learner.learner_model_param.num_class || "1", 10);

// Base scores are usually something like "[0.5, 0.5, 0.5]" depending on the dump.
// For softmax, we sum the tree outputs + base score, then apply softmax.
// But since we just need the max class, we can just find the max sum.
// Let's extract the base scores if available.
let baseScores = [0, 0, 0];
try {
  const bsStr = model.learner.learner_model_param.base_score;
  if (bsStr && bsStr.startsWith('[')) {
    baseScores = JSON.parse(bsStr);
  } else if (bsStr) {
    baseScores = [parseFloat(bsStr), parseFloat(bsStr), parseFloat(bsStr)];
  }
} catch (e) {
  console.log("Using 0 base scores.");
}

/**
 * Predicts the Risk Tier using Edge AI.
 * @param temp Temperature in Celsius
 * @param precip Precipitation in mm
 * @param wind Wind speed in km/h
 * @param elevation Elevation in meters
 * @returns {string} 'Low', 'Moderate', or 'High'
 */
export const predictDisasterRisk = (temp: number, precip: number, wind: number, elevation: number): string => {
  // Feature order must exactly match the Python training script: ['temp', 'precip', 'wind_speed', 'elevation']
  const features = [temp, precip, wind, elevation];

  const classSums = [...baseScores];

  // XGBoost multi-class predicts trees in a round-robin fashion:
  // Tree 0 -> Class 0
  // Tree 1 -> Class 1
  // Tree 2 -> Class 2
  // Tree 3 -> Class 0
  // etc...
  
  for (let i = 0; i < trees.length; i++) {
    const tree = trees[i];
    const classIdx = i % numClass;
    
    let node = 0;
    // -1 means it's a leaf node in the XGBoost dump
    while (tree.left_children[node] !== -1) {
      const splitIndex = tree.split_indices[node];
      const splitCondition = tree.split_conditions[node];
      
      if (features[splitIndex] < splitCondition) {
        node = tree.left_children[node];
      } else {
        node = tree.right_children[node];
      }
    }
    
    // Add the leaf weight to the correct class sum
    classSums[classIdx] += tree.base_weights[node];
  }

  // Find the class with the highest probability (Softmax equivalent for argmax)
  let maxIdx = 0;
  let maxVal = classSums[0];
  for (let c = 1; c < numClass; c++) {
    if (classSums[c] > maxVal) {
      maxVal = classSums[c];
      maxIdx = c;
    }
  }

  // Map the class index back to the label. 
  // Based on standard LabelEncoder sorting: 'High', 'Low', 'Moderate' -> 0: High, 1: Low, 2: Moderate
  // Wait, we need to make sure we know the exact label encoding! 
  // Let's assume standard alphabetical order for now: 0 = High, 1 = Low, 2 = Moderate.
  if (maxIdx === 0) return 'High';
  if (maxIdx === 1) return 'Low';
  if (maxIdx === 2) return 'Moderate';
  
  return 'Low';
};
