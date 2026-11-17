"""Private recipe collection routes."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import Ingredient, Recipe, Step, Tag, User
from app.schemas import (
    IngredientInput,
    IngredientResponse,
    RecipeCreate,
    RecipeResponse,
    RecipeUpdate,
    StepInput,
    StepResponse,
)

router = APIRouter(prefix="/api/v1/recipes", tags=["recipes"])
CurrentUser = Annotated[User, Depends(get_current_user)]


def _resolve_tags(db: Session, names: list[str]) -> list[Tag]:
    existing_tags = db.scalars(select(Tag)).all()
    by_normalized_name = {tag.name.casefold(): tag for tag in existing_tags}
    tags: list[Tag] = []
    for name in names:
        key = name.casefold()
        tag = by_normalized_name.get(key)
        if tag is None:
            tag = Tag(name=name)
            by_normalized_name[key] = tag
        tags.append(tag)
    return tags


def _make_ingredients(items: list[IngredientInput]) -> list[Ingredient]:
    return [
        Ingredient(
            name=item.name,
            quantity=item.quantity,
            unit=item.unit,
            position=position,
        )
        for position, item in enumerate(items)
    ]


def _make_steps(items: list[StepInput]) -> list[Step]:
    return [
        Step(
            text=item.text,
            duration_minutes=item.duration_minutes,
            temperature_c=item.temperature_c,
            position=position,
        )
        for position, item in enumerate(items)
    ]


def _recipe_response(recipe: Recipe) -> RecipeResponse:
    return RecipeResponse(
        id=recipe.id,
        name=recipe.name,
        original_text=recipe.original_text,
        ingredients=[
            IngredientResponse.model_validate(item)
            for item in sorted(recipe.ingredients, key=lambda ingredient: ingredient.position)
        ],
        steps=[
            StepResponse.model_validate(item)
            for item in sorted(recipe.steps, key=lambda step: step.position)
        ],
        tags=sorted({tag.name for tag in recipe.tags}, key=str.casefold),
        created_at=recipe.created_at,
        updated_at=recipe.updated_at,
    )


def _owned_recipe(db: Session, owner_id: int, recipe_id: int) -> Recipe:
    recipe = db.scalar(
        select(Recipe).where(Recipe.id == recipe_id, Recipe.owner_id == owner_id)
    )
    if recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    return recipe


@router.get("", response_model=list[RecipeResponse], summary="List and search recipes")
def list_recipes(
    owner: CurrentUser,
    db: Session = Depends(get_db),
    q: Annotated[str | None, Query(max_length=200)] = None,
) -> list[RecipeResponse]:
    """List the owner's recipes, optionally searching names and tags."""

    query = select(Recipe).where(Recipe.owner_id == owner.id)
    term = q.strip() if q else ""
    recipes = db.scalars(query.order_by(Recipe.updated_at.desc(), Recipe.id.desc())).all()
    if term:
        normalized_term = term.casefold()
        recipes = [
            recipe
            for recipe in recipes
            if normalized_term in recipe.name.casefold()
            or any(normalized_term in tag.name.casefold() for tag in recipe.tags)
        ]
    return [_recipe_response(recipe) for recipe in recipes]


@router.post(
    "",
    response_model=RecipeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a structured recipe",
)
def create_recipe(
    payload: RecipeCreate,
    owner: CurrentUser,
    db: Session = Depends(get_db),
) -> RecipeResponse:
    """Create a recipe with structured ingredients, steps, and reusable tags."""

    recipe = Recipe(
        owner_id=owner.id,
        name=payload.name,
        original_text=payload.original_text,
        ingredients=_make_ingredients(payload.ingredients),
        steps=_make_steps(payload.steps),
        tags=_resolve_tags(db, payload.tags),
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return _recipe_response(recipe)


@router.get("/{recipe_id}", response_model=RecipeResponse, summary="Get a recipe")
def get_recipe(
    recipe_id: int,
    owner: CurrentUser,
    db: Session = Depends(get_db),
) -> RecipeResponse:
    """Return a recipe owned by the signed-in account."""

    return _recipe_response(_owned_recipe(db, owner.id, recipe_id))


@router.patch("/{recipe_id}", response_model=RecipeResponse, summary="Update a recipe")
def update_recipe(
    recipe_id: int,
    payload: RecipeUpdate,
    owner: CurrentUser,
    db: Session = Depends(get_db),
) -> RecipeResponse:
    """Update supplied recipe fields while preserving omitted fields."""

    recipe = _owned_recipe(db, owner.id, recipe_id)
    changes = payload.model_dump(exclude_unset=True)
    if "name" in changes:
        if changes["name"] is None:
            raise HTTPException(status_code=422, detail="Recipe name cannot be null")
        recipe.name = changes["name"]
    if "original_text" in changes:
        recipe.original_text = changes["original_text"]
    if "ingredients" in changes:
        if changes["ingredients"] is None:
            raise HTTPException(
                status_code=422,
                detail="Ingredients cannot be null; use an empty list",
            )
        recipe.ingredients = _make_ingredients(payload.ingredients or [])
    if "steps" in changes:
        if changes["steps"] is None:
            raise HTTPException(status_code=422, detail="Steps cannot be null; use an empty list")
        recipe.steps = _make_steps(payload.steps or [])
    if "tags" in changes:
        if changes["tags"] is None:
            raise HTTPException(status_code=422, detail="Tags cannot be null; use an empty list")
        recipe.tags = _resolve_tags(db, payload.tags or [])

    recipe.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(recipe)
    return _recipe_response(recipe)


@router.delete(
    "/{recipe_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a recipe",
)
def delete_recipe(
    recipe_id: int,
    owner: CurrentUser,
    db: Session = Depends(get_db),
) -> Response:
    """Delete a recipe belonging to the signed-in account."""

    recipe = _owned_recipe(db, owner.id, recipe_id)
    db.delete(recipe)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
