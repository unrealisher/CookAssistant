import { RecipeCollectionWidget } from "../../widgets/recipe-collection/RecipeCollectionWidget";

interface CollectionPageProps {
  onCreate: () => void;
  onOpen: (recipeId: number) => void;
  onUnauthorized: () => void;
}

export function CollectionPage({ onCreate, onOpen, onUnauthorized }: CollectionPageProps) {
  return <RecipeCollectionWidget onCreate={onCreate} onOpen={onOpen} onUnauthorized={onUnauthorized} />;
}
