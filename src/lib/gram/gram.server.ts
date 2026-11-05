import "server-only";

import { graphql } from "@/gql";
import { runMutation, runQuery } from "@/lib/graphql.server";
import type { AlbumFilter, AlbumSuggestionInput, ReportInput } from "@/gql/graphql";

/**
 * What every page shows of an item: enough for the grid, the viewer and the item page. Pages for visitors get no
 * uploader, position or original from the server anyway.
 */
graphql(`
    fragment ItemFields on Item {
        id
        type
        status
        failure
        takenAt
        caption
        photographer
        latitude
        longitude
        width
        height
        durationMs
        visibility
        effectiveVisibility
        contributionStatus
        mine
        uploadedBy
        originalFileName
        createdAt
        album { id title visibility }
        media { thumbnailUrl previewUrl videoUrl originalUrl expiresAt }
    }
`);

graphql(`
    fragment AlbumCardFields on Album {
        id
        title
        dateFrom
        dateTo
        place
        visibility
        itemCount
        kind { id nameSv nameEn }
        spex { id title year revival parentId familyId categoryId categoryName }
        cover { id caption type width height media { thumbnailUrl previewUrl expiresAt } }
    }
`);

const MeQuery = graphql(`
    query Me {
        me { username displayName email roles }
        limits { maxUploadBytes maxVideoMinutes contributionMaxItems contributionMaxGb canDownloadOriginals }
    }
`);

const HomeQuery = graphql(`
    query Home {
        startPage { welcome contactEmail }
        recentAlbums(limit: 12) { ...AlbumCardFields }
        thisDayInHistory(limit: 30) { ...ItemFields }
        categories { id name albumCount }
        years
        albumKinds { id nameSv nameEn albumCount }
        spexWithAlbums { id title year revival parentId familyId categoryName albumCount }
    }
`);

const BrowseQuery = graphql(`
    query Browse($filter: AlbumFilter, $page: Int, $size: Int) {
        albums(filter: $filter, page: $page, size: $size) {
            albums { ...AlbumCardFields }
            totalCount
            page
            size
        }
        categories { id name albumCount }
        years
        albumKinds { id nameSv nameEn albumCount }
        spexWithAlbums { id title year revival parentId familyId categoryName albumCount }
    }
`);

const AlbumQuery = graphql(`
    query Album($id: ID!, $size: Int) {
        album(id: $id) {
            ...AlbumCardFields
            description
            createdAt
            items(page: 0, size: $size) { items { ...ItemFields } totalCount page size }
        }
        limits { canDownloadOriginals }
    }
`);

const AlbumMetaQuery = graphql(`
    query AlbumMeta($id: ID!) {
        album(id: $id) {
            id
            title
            description
            visibility
            dateFrom
            cover { id caption effectiveVisibility media { previewUrl expiresAt } }
        }
    }
`);

const AlbumItemsQuery = graphql(`
    query AlbumItems($id: ID!, $page: Int, $size: Int) {
        album(id: $id) {
            id
            items(page: $page, size: $size) { items { ...ItemFields } totalCount page size }
        }
    }
`);

const ItemQuery = graphql(`
    query Item($id: ID!) {
        item(id: $id) { ...ItemFields }
        limits { canDownloadOriginals }
    }
`);

const ItemsByIdQuery = graphql(`
    query ItemsById($ids: [ID!]!) {
        publicItems(ids: $ids) { ...ItemFields }
    }
`);

const SpexAlbumsQuery = graphql(`
    query SpexAlbums($spexId: ID!) {
        spexAlbums(spexId: $spexId) { ...AlbumCardFields description }
    }
`);

const SearchQuery = graphql(`
    query Search($q: String!) {
        search(q: $q, limit: 60) {
            albums { ...AlbumCardFields }
            items { ...ItemFields }
        }
    }
`);

const SmartSearchQuery = graphql(`
    query SmartSearch($q: String!, $filter: AlbumFilter) {
        smartSearch(q: $q, filter: $filter, limit: 60) { ...ItemFields }
    }
`);

const SearchFiltersQuery = graphql(`
    query SearchFilters {
        categories { id name albumCount }
        years
        albumKinds { id nameSv nameEn albumCount }
    }
`);

const MapItemsQuery = graphql(`
    query MapItems($filter: AlbumFilter) {
        mapItems(filter: $filter) { id latitude longitude takenAt thumbnailUrl }
    }
`);

const MyContributionsQuery = graphql(`
    query MyContributions {
        myContributions { ...ItemFields }
    }
`);

const MySuggestionsQuery = graphql(`
    query MySuggestions {
        open: albumSuggestions(open: true) { id title status message createdAt handledAt album { id title } }
        handled: albumSuggestions(open: false) { id title status message createdAt handledAt album { id title } }
        albumKinds { id nameSv nameEn }
    }
`);

graphql(`
    fragment MyReport on Report {
        id reason message status outcome outcomeMessage createdAt handledAt
        item { id caption type media { thumbnailUrl expiresAt } album { id title } }
    }
`);

const MyReportsQuery = graphql(`
    query MyReports {
        open: reports(open: true, mine: true) { ...MyReport }
        handled: reports(open: false, mine: true) { ...MyReport }
    }
`);

const ContributeQuery = graphql(`
    query Contribute($id: ID!) {
        album(id: $id) { id title visibility suggested }
        limits { maxUploadBytes maxVideoMinutes contributionMaxItems contributionMaxGb }
    }
`);

const ReportCreateMutation = graphql(`
    mutation ReportCreate($input: ReportInput!) {
        reportCreate(input: $input) { id status }
    }
`);

const ContributionsAddMutation = graphql(`
    mutation ContributionsAdd($albumId: ID!, $uploadIds: [String!]!) {
        contributionsAdd(albumId: $albumId, uploadIds: $uploadIds) {
            uploadId fileName outcome message existingAlbumTitle
            item { id }
            existingItem { id album { id title } }
        }
    }
`);

const ContributionWithdrawMutation = graphql(`
    mutation ContributionWithdraw($itemId: ID!) { contributionWithdraw(itemId: $itemId) }
`);

const AlbumSuggestMutation = graphql(`
    mutation AlbumSuggest($input: AlbumSuggestionInput!) {
        albumSuggest(input: $input) { id album { id } }
    }
`);

export const getMe = async () => runQuery(MeQuery, {});
export const getHome = async () => runQuery(HomeQuery, {});
export const getBrowse = async (filter: AlbumFilter, page: number, size: number) =>
  runQuery(BrowseQuery, { filter, page, size });
export const getAlbum = async (id: string, size: number) => runQuery(AlbumQuery, { id, size });
export const getAlbumMeta = async (id: string) => (await runQuery(AlbumMetaQuery, { id }))?.album ?? null;
export const getAlbumItems = async (id: string, page: number, size: number) =>
  (await runQuery(AlbumItemsQuery, { id, page, size }))?.album?.items ?? null;
export const getItem = async (id: string) => runQuery(ItemQuery, { id });
export const getItemsById = async (ids: string[]) => (await runQuery(ItemsByIdQuery, { ids }))?.publicItems ?? [];
export const getSpexAlbums = async (spexId: string) => (await runQuery(SpexAlbumsQuery, { spexId }))?.spexAlbums ?? [];
export const search = async (q: string) => (await runQuery(SearchQuery, { q }))?.search;
export const smartSearch = async (q: string, filter: AlbumFilter) =>
  (await runQuery(SmartSearchQuery, { q, filter }))?.smartSearch ?? [];
export const getSearchFilters = async () => runQuery(SearchFiltersQuery, {});
export const getMapItems = async (filter: AlbumFilter) => (await runQuery(MapItemsQuery, { filter }))?.mapItems ?? [];
export const getMyContributions = async () => (await runQuery(MyContributionsQuery, {}))?.myContributions ?? [];
export const getMySuggestions = async () => {
  const data = await runQuery(MySuggestionsQuery, {});

  return { suggestions: [...data?.open ?? [], ...data?.handled ?? []], kinds: data?.albumKinds ?? [] };
};
export const getMyReports = async () => {
  const data = await runQuery(MyReportsQuery, {});

  return [...data?.open ?? [], ...data?.handled ?? []];
};
export const getContribute = async (id: string) => runQuery(ContributeQuery, { id });
export const reportCreate = (input: ReportInput) => runMutation(ReportCreateMutation, { input });
export const contributionsAdd = async (albumId: string, uploadIds: string[]) =>
  (await runMutation(ContributionsAddMutation, { albumId, uploadIds }))?.contributionsAdd ?? [];
export const contributionWithdraw = (itemId: string) => runMutation(ContributionWithdrawMutation, { itemId });
export const albumSuggest = async (input: AlbumSuggestionInput) =>
  (await runMutation(AlbumSuggestMutation, { input }))?.albumSuggest;
