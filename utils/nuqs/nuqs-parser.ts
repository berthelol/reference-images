import {
  ImageSortColumn,
  ImageSortColumnMap,
  SortDirection,
} from "@/utils/orpc/types";
import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsIsoDate,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";

export const filtersNuqsParsers = {
  rangeNumber: parseAsArrayOf(parseAsInteger),
  tags: parseAsArrayOf(parseAsString),
  rangeDate: parseAsArrayOf(parseAsIsoDate),
  boolean: parseAsBoolean,
};

export const videosSearchParamsParser = {
  tags: filtersNuqsParsers.tags,

  // sorting
  sort_column: parseAsStringEnum(Object.values(ImageSortColumn)),
  sort_direction: parseAsStringEnum(Object.values(SortDirection)),
};

export const tagsSearchParamsParser = {
  tags: filtersNuqsParsers.tags,
};
