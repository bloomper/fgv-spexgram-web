import "server-only";

import { graphql } from "@/gql";
import { runMutation, runQuery } from "@/lib/graphql.server";
import type { AlbumFilter, AlbumInput, ItemInput, ItemsInput, ReportOutcome, Visibility } from "@/gql/graphql";

const ManageAlbumsQuery = graphql(`
    query ManageAlbums($filter: AlbumFilter, $page: Int, $size: Int) {
        albums(filter: $filter, page: $page, size: $size) {
            albums { ...AlbumCardFields suggested lastModifiedAt createdAt }
            totalCount
            page
            size
        }
    }
`);

const ManageAlbumQuery = graphql(`
    query ManageAlbum($id: ID!) {
        album(id: $id) {
            ...AlbumCardFields
            description
            suggested
            trashedAt
            createdAt
            lastModifiedAt
            visibilityCounts { visibility count }
            items(page: 0, size: 500) { items { ...ItemFields fileSize trashedAt } totalCount page size }
        }
        albumKinds { id nameSv nameEn isDefault }
        limits { maxUploadBytes maxVideoMinutes }
    }
`);

const AlbumKindsQuery = graphql(`
    query AlbumKinds { albumKinds { id nameSv nameEn isDefault position albumCount } }
`);

const AlbumTitlesQuery = graphql(`
    query AlbumTitles {
        albums(page: 0, size: 500) { albums { id title dateFrom visibility } }
    }
`);

const SpexSearchQuery = graphql(`
    query SpexSearch($q: String!) {
        spexSearch(q: $q) { id title year revival parentId categoryName }
    }
`);

const ContributionsQuery = graphql(`
    query Contributions {
        contributions { ...ItemFields fileSize }
        albumSuggestions(open: true) {
            id title suggestedBy status createdAt
            album { id title dateFrom dateTo place description }
        }
    }
`);

const ReportsQuery = graphql(`
    query Reports($open: Boolean) {
        reports(open: $open) {
            id reason message status reporter byVisitor outcome outcomeMessage createdAt handledAt
            item { id caption type visibility effectiveVisibility media { thumbnailUrl expiresAt } album { id title } }
        }
    }
`);

const UnsortedQuery = graphql(`
    query Unsorted { unsorted { date items { ...ItemFields } } }
`);

const TrashQuery = graphql(`
    query Trash {
        trash {
            albums { id title dateFrom trashedAt itemCount }
            items { ...ItemFields trashedAt }
        }
    }
`);

const AlbumCreateMutation = graphql(`
    mutation AlbumCreate($input: AlbumInput!) { albumCreate(input: $input) { id } }
`);
const AlbumUpdateMutation = graphql(`
    mutation AlbumUpdate($id: ID!, $input: AlbumInput!) { albumUpdate(id: $id, input: $input) { id } }
`);
const AlbumSetVisibilityMutation = graphql(`
    mutation AlbumSetVisibility($id: ID!, $visibility: Visibility!, $items: Boolean) {
        albumSetVisibility(id: $id, visibility: $visibility, items: $items) { id visibility }
    }
`);
const AlbumSetCoverMutation = graphql(`
    mutation AlbumSetCover($id: ID!, $itemId: ID) { albumSetCover(id: $id, itemId: $itemId) { id } }
`);
const AlbumTrashMutation = graphql(`
    mutation AlbumTrash($id: ID!) { albumTrash(id: $id) { id } }
`);
const AlbumRestoreMutation = graphql(`
    mutation AlbumRestore($id: ID!) { albumRestore(id: $id) { id } }
`);
const AlbumDeleteMutation = graphql(`
    mutation AlbumDelete($id: ID!, $keepItems: Boolean) { albumDelete(id: $id, keepItems: $keepItems) }
`);
const ItemsAddMutation = graphql(`
    mutation ItemsAdd($albumId: ID!, $uploadIds: [String!]!) {
        itemsAdd(albumId: $albumId, uploadIds: $uploadIds) {
            uploadId fileName outcome message existingAlbumTitle
            item { id }
            existingItem { id album { id title } }
        }
    }
`);
const ItemUpdateMutation = graphql(`
    mutation ItemUpdate($id: ID!, $input: ItemInput!) { itemUpdate(id: $id, input: $input) { id } }
`);
const ItemsUpdateMutation = graphql(`
    mutation ItemsUpdate($ids: [ID!]!, $input: ItemsInput!) { itemsUpdate(ids: $ids, input: $input) { id } }
`);
const ItemsTrashMutation = graphql(`
    mutation ItemsTrash($ids: [ID!]!) { itemsTrash(ids: $ids) { id } }
`);
const ItemsRestoreMutation = graphql(`
    mutation ItemsRestore($ids: [ID!]!) { itemsRestore(ids: $ids) { id } }
`);
const ItemsDeleteMutation = graphql(`
    mutation ItemsDelete($ids: [ID!]!) { itemsDelete(ids: $ids) }
`);
const ContributionsReviewMutation = graphql(`
    mutation ContributionsReview($itemIds: [ID!]!, $accept: Boolean!, $message: String) {
        contributionsReview(itemIds: $itemIds, accept: $accept, message: $message) { id accepted }
    }
`);
const AlbumSuggestionReviewMutation = graphql(`
    mutation AlbumSuggestionReview($id: ID!, $accept: Boolean!, $message: String) {
        albumSuggestionReview(id: $id, accept: $accept, message: $message) { id status }
    }
`);
const ReportHandleMutation = graphql(`
    mutation ReportHandle($id: ID!, $outcome: ReportOutcome!, $message: String) {
        reportHandle(id: $id, outcome: $outcome, message: $message) { id status }
    }
`);
const TrashEmptyMutation = graphql(`
    mutation TrashEmpty { trashEmpty }
`);

export const getManageAlbums = async (filter: AlbumFilter, page: number, size: number) =>
  (await runQuery(ManageAlbumsQuery, { filter, page, size }))?.albums;
export const getManageAlbum = async (id: string) => runQuery(ManageAlbumQuery, { id });
export const getAlbumKinds = async () => (await runQuery(AlbumKindsQuery, {}))?.albumKinds ?? [];
export const getAlbumTitles = async () => (await runQuery(AlbumTitlesQuery, {}))?.albums.albums ?? [];
export const searchSpex = async (q: string) => (await runQuery(SpexSearchQuery, { q }))?.spexSearch ?? [];
export const getContributions = async () => runQuery(ContributionsQuery, {});
export const getReports = async (open: boolean) => (await runQuery(ReportsQuery, { open }))?.reports ?? [];
export const getUnsorted = async () => (await runQuery(UnsortedQuery, {}))?.unsorted ?? [];
export const getTrash = async () => (await runQuery(TrashQuery, {}))?.trash;

export const albumCreate = async (input: AlbumInput) => (await runMutation(AlbumCreateMutation, { input }))?.albumCreate;
export const albumUpdate = (id: string, input: AlbumInput) => runMutation(AlbumUpdateMutation, { id, input });
export const albumSetVisibility = (id: string, visibility: Visibility, items: boolean) =>
  runMutation(AlbumSetVisibilityMutation, { id, visibility, items });
export const albumSetCover = (id: string, itemId: string | null) => runMutation(AlbumSetCoverMutation, { id, itemId });
export const albumTrash = (id: string) => runMutation(AlbumTrashMutation, { id });
export const albumRestore = (id: string) => runMutation(AlbumRestoreMutation, { id });
export const albumDelete = (id: string, keepItems: boolean) => runMutation(AlbumDeleteMutation, { id, keepItems });
export const itemsAdd = async (albumId: string, uploadIds: string[]) =>
  (await runMutation(ItemsAddMutation, { albumId, uploadIds }))?.itemsAdd ?? [];
export const itemUpdate = (id: string, input: ItemInput) => runMutation(ItemUpdateMutation, { id, input });
export const itemsUpdate = (ids: string[], input: ItemsInput) => runMutation(ItemsUpdateMutation, { ids, input });
export const itemsTrash = (ids: string[]) => runMutation(ItemsTrashMutation, { ids });
export const itemsRestore = (ids: string[]) => runMutation(ItemsRestoreMutation, { ids });
export const itemsDelete = (ids: string[]) => runMutation(ItemsDeleteMutation, { ids });
export const contributionsReview = (itemIds: string[], accept: boolean, message: string | null) =>
  runMutation(ContributionsReviewMutation, { itemIds, accept, message });
export const albumSuggestionReview = (id: string, accept: boolean, message: string | null) =>
  runMutation(AlbumSuggestionReviewMutation, { id, accept, message });
export const reportHandle = (id: string, outcome: ReportOutcome, message: string | null) =>
  runMutation(ReportHandleMutation, { id, outcome, message });
export const trashEmpty = () => runMutation(TrashEmptyMutation, {});
