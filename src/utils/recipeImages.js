const recipeImages = {
  Comida: require('../../assets/comida.jpg'),
  Postre: require('../../assets/postre.jpg'),
};

export const recipeImageForCategory = (category) =>
  recipeImages[String(category).toLowerCase() === 'postre' ? 'Postre' : 'Comida'];
