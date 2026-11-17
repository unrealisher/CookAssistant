"""Request and response models for the versioned API."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator


Username = Annotated[str, Field(min_length=1, max_length=64)]
Password = Annotated[str, Field(min_length=12, max_length=256)]
Name = Annotated[str, Field(min_length=1, max_length=255)]
TagName = Annotated[str, Field(min_length=1, max_length=80)]


class Credentials(BaseModel):
    """Credentials accepted by initial owner setup and login."""

    username: Username
    password: Password

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Username must not be blank")
        return normalized


class UserResponse(BaseModel):
    """Public information about the local owner account."""

    id: int
    username: str


class SetupStatus(BaseModel):
    """Whether the first owner still needs to be configured."""

    setup_required: bool


class IngredientInput(BaseModel):
    """A recipe ingredient with free-form amount and unit fields."""

    name: Name
    quantity: str | None = Field(default=None, max_length=100)
    unit: str | None = Field(default=None, max_length=80)

    @field_validator("name")
    @classmethod
    def trim_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Ingredient name must not be blank")
        return normalized

    @field_validator("quantity", "unit")
    @classmethod
    def trim_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class StepInput(BaseModel):
    """A recipe step with optional duration and temperature."""

    text: Annotated[str, Field(min_length=1, max_length=4000)]
    duration_minutes: int | None = Field(default=None, ge=0, le=100_000)
    temperature_c: float | None = Field(default=None, ge=-273.15, le=10_000)

    @field_validator("text")
    @classmethod
    def trim_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Step text must not be blank")
        return normalized


class RecipeFields(BaseModel):
    """Shared recipe fields accepted when creating or updating a recipe."""

    name: Name
    original_text: str | None = Field(default=None, max_length=20_000)
    ingredients: list[IngredientInput] = Field(default_factory=list, max_length=500)
    steps: list[StepInput] = Field(default_factory=list, max_length=500)
    tags: list[TagName] = Field(default_factory=list, max_length=100)

    @field_validator("name")
    @classmethod
    def trim_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Recipe name must not be blank")
        return normalized

    @field_validator("original_text")
    @classmethod
    def trim_original_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, values: list[str]) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()
        for value in values:
            tag = value.strip()
            if not tag:
                raise ValueError("Tags must not be blank")
            key = tag.casefold()
            if key not in seen:
                seen.add(key)
                normalized.append(tag)
        return normalized


class RecipeCreate(RecipeFields):
    """Structured recipe payload for creating a recipe."""


class RecipeUpdate(BaseModel):
    """Partial structured recipe payload for editing a recipe."""

    name: Name | None = None
    original_text: str | None = Field(default=None, max_length=20_000)
    ingredients: list[IngredientInput] | None = Field(default=None, max_length=500)
    steps: list[StepInput] | None = Field(default=None, max_length=500)
    tags: list[TagName] | None = Field(default=None, max_length=100)

    @field_validator("name")
    @classmethod
    def trim_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("Recipe name must not be blank")
        return normalized

    @field_validator("original_text")
    @classmethod
    def trim_original_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, values: list[str] | None) -> list[str] | None:
        if values is None:
            return None
        normalized: list[str] = []
        seen: set[str] = set()
        for value in values:
            tag = value.strip()
            if not tag:
                raise ValueError("Tags must not be blank")
            key = tag.casefold()
            if key not in seen:
                seen.add(key)
                normalized.append(tag)
        return normalized


class IngredientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    quantity: str | None
    unit: str | None
    position: int


class StepResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    text: str
    duration_minutes: int | None
    temperature_c: float | None
    position: int


class RecipeResponse(BaseModel):
    """Recipe data returned by the private recipe API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    original_text: str | None
    ingredients: list[IngredientResponse]
    steps: list[StepResponse]
    tags: list[str]
    created_at: datetime
    updated_at: datetime
