/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n    query AuditLog($page: Int, $size: Int, $filter: AuditFilter) {\n        auditLog(page: $page, size: $size, filter: $filter) {\n            totalCount page size\n            entries { id at actorId actorName action entityType entityId summary }\n        }\n    }\n": typeof types.AuditLogDocument,
    "\n    query AuditActors { auditActors { id name } }\n": typeof types.AuditActorsDocument,
    "\n    query Settings {\n        settings {\n            welcomeSv welcomeEn publicWelcomeSv publicWelcomeEn contactEmail maxUploadGb maxVideoMinutes\n            contributionMaxItems contributionMaxGb userDownloadsOriginals showPositions\n        }\n    }\n": typeof types.SettingsDocument,
    "\n    mutation SettingsUpdate($input: SettingsInput!) { settingsUpdate(input: $input) { maxUploadGb } }\n": typeof types.SettingsUpdateDocument,
    "\n    query MaintenanceJobs { maintenanceJobs { job schedule running lastStartedAt lastFinishedAt lastSucceeded } }\n": typeof types.MaintenanceJobsDocument,
    "\n    mutation MaintenanceJobRun($job: MaintenanceJob!) { maintenanceJobRun(job: $job) }\n": typeof types.MaintenanceJobRunDocument,
    "\n    query ImmichStatus {\n        immichStatus {\n            available version usedBytes availableBytes sizeBytes\n            queues { name paused active waiting failed }\n            failedItems { id caption type status failure originalFileName album { id title } media { thumbnailUrl expiresAt } }\n        }\n    }\n": typeof types.ImmichStatusDocument,
    "\n    mutation ImmichJobRun($itemIds: [ID!]!, $job: ImmichJob!) { immichJobRun(itemIds: $itemIds, job: $job) }\n": typeof types.ImmichJobRunDocument,
    "\n    mutation AlbumKindCreate($input: AlbumKindInput!) { albumKindCreate(input: $input) { id } }\n": typeof types.AlbumKindCreateDocument,
    "\n    mutation AlbumKindUpdate($id: ID!, $input: AlbumKindInput!) { albumKindUpdate(id: $id, input: $input) { id } }\n": typeof types.AlbumKindUpdateDocument,
    "\n    mutation AlbumKindsReorder($ids: [ID!]!) { albumKindsReorder(ids: $ids) { id } }\n": typeof types.AlbumKindsReorderDocument,
    "\n    mutation AlbumKindDelete($id: ID!) { albumKindDelete(id: $id) }\n": typeof types.AlbumKindDeleteDocument,
    "\n    fragment ItemFields on Item {\n        id\n        type\n        status\n        failure\n        takenAt\n        caption\n        photographer\n        latitude\n        longitude\n        width\n        height\n        durationMs\n        visibility\n        effectiveVisibility\n        contributionStatus\n        mine\n        uploadedBy\n        originalFileName\n        createdAt\n        album { id title visibility }\n        media { thumbnailUrl previewUrl videoUrl originalUrl expiresAt }\n    }\n": typeof types.ItemFieldsFragmentDoc,
    "\n    fragment AlbumCardFields on Album {\n        id\n        title\n        dateFrom\n        dateTo\n        place\n        visibility\n        itemCount\n        kind { id nameSv nameEn }\n        spex { id title year revival parentId familyId categoryId categoryName }\n        cover { id caption type width height media { thumbnailUrl previewUrl expiresAt } }\n    }\n": typeof types.AlbumCardFieldsFragmentDoc,
    "\n    query Me {\n        me { username displayName email roles }\n        limits { maxUploadBytes maxVideoMinutes contributionMaxItems contributionMaxGb canDownloadOriginals }\n    }\n": typeof types.MeDocument,
    "\n    query Home {\n        startPage { welcome contactEmail }\n        recentAlbums(limit: 12) { ...AlbumCardFields }\n        thisDayInHistory(limit: 30) { ...ItemFields }\n        categories { id name albumCount }\n        years\n        albumKinds { id nameSv nameEn albumCount }\n        spexWithAlbums { id title year revival parentId familyId categoryName albumCount }\n    }\n": typeof types.HomeDocument,
    "\n    query Browse($filter: AlbumFilter, $page: Int, $size: Int) {\n        albums(filter: $filter, page: $page, size: $size) {\n            albums { ...AlbumCardFields }\n            totalCount\n            page\n            size\n        }\n        categories { id name albumCount }\n        years\n        albumKinds { id nameSv nameEn albumCount }\n        spexWithAlbums { id title year revival parentId familyId categoryName albumCount }\n    }\n": typeof types.BrowseDocument,
    "\n    query Album($id: ID!, $size: Int) {\n        album(id: $id) {\n            ...AlbumCardFields\n            description\n            createdAt\n            items(page: 0, size: $size) { items { ...ItemFields } totalCount page size }\n        }\n        limits { canDownloadOriginals }\n    }\n": typeof types.AlbumDocument,
    "\n    query AlbumMeta($id: ID!) {\n        album(id: $id) {\n            id\n            title\n            description\n            visibility\n            dateFrom\n            cover { id caption effectiveVisibility media { previewUrl expiresAt } }\n        }\n    }\n": typeof types.AlbumMetaDocument,
    "\n    query AlbumItems($id: ID!, $page: Int, $size: Int) {\n        album(id: $id) {\n            id\n            items(page: $page, size: $size) { items { ...ItemFields } totalCount page size }\n        }\n    }\n": typeof types.AlbumItemsDocument,
    "\n    query Item($id: ID!) {\n        item(id: $id) { ...ItemFields }\n        limits { canDownloadOriginals }\n    }\n": typeof types.ItemDocument,
    "\n    query ItemsById($ids: [ID!]!) {\n        publicItems(ids: $ids) { ...ItemFields }\n    }\n": typeof types.ItemsByIdDocument,
    "\n    query SpexAlbums($spexId: ID!) {\n        spexAlbums(spexId: $spexId) { ...AlbumCardFields description }\n    }\n": typeof types.SpexAlbumsDocument,
    "\n    query Search($q: String!) {\n        search(q: $q, limit: 60) {\n            albums { ...AlbumCardFields }\n            items { ...ItemFields }\n        }\n    }\n": typeof types.SearchDocument,
    "\n    query SmartSearch($q: String!, $filter: AlbumFilter) {\n        smartSearch(q: $q, filter: $filter, limit: 60) { ...ItemFields }\n    }\n": typeof types.SmartSearchDocument,
    "\n    query SearchFilters {\n        categories { id name albumCount }\n        years\n        albumKinds { id nameSv nameEn albumCount }\n    }\n": typeof types.SearchFiltersDocument,
    "\n    query MapItems($filter: AlbumFilter) {\n        mapItems(filter: $filter) { id latitude longitude takenAt thumbnailUrl }\n    }\n": typeof types.MapItemsDocument,
    "\n    query MyContributions {\n        myContributions { ...ItemFields }\n    }\n": typeof types.MyContributionsDocument,
    "\n    query MySuggestions {\n        open: albumSuggestions(open: true) { id title status message createdAt handledAt album { id title } }\n        handled: albumSuggestions(open: false) { id title status message createdAt handledAt album { id title } }\n        albumKinds { id nameSv nameEn }\n    }\n": typeof types.MySuggestionsDocument,
    "\n    fragment MyReport on Report {\n        id reason message status outcome outcomeMessage createdAt handledAt\n        item { id caption type media { thumbnailUrl expiresAt } album { id title } }\n    }\n": typeof types.MyReportFragmentDoc,
    "\n    query MyReports {\n        open: reports(open: true, mine: true) { ...MyReport }\n        handled: reports(open: false, mine: true) { ...MyReport }\n    }\n": typeof types.MyReportsDocument,
    "\n    query Contribute($id: ID!) {\n        album(id: $id) { id title visibility suggested }\n        limits { maxUploadBytes maxVideoMinutes contributionMaxItems contributionMaxGb }\n    }\n": typeof types.ContributeDocument,
    "\n    mutation ReportCreate($input: ReportInput!) {\n        reportCreate(input: $input) { id status }\n    }\n": typeof types.ReportCreateDocument,
    "\n    mutation ContributionsAdd($albumId: ID!, $uploadIds: [String!]!) {\n        contributionsAdd(albumId: $albumId, uploadIds: $uploadIds) {\n            uploadId fileName outcome message existingAlbumTitle\n            item { id }\n            existingItem { id album { id title } }\n        }\n    }\n": typeof types.ContributionsAddDocument,
    "\n    mutation ContributionWithdraw($itemId: ID!) { contributionWithdraw(itemId: $itemId) }\n": typeof types.ContributionWithdrawDocument,
    "\n    mutation AlbumSuggest($input: AlbumSuggestionInput!) {\n        albumSuggest(input: $input) { id album { id } }\n    }\n": typeof types.AlbumSuggestDocument,
    "\n    query ManageAlbums($filter: AlbumFilter, $page: Int, $size: Int) {\n        albums(filter: $filter, page: $page, size: $size) {\n            albums { ...AlbumCardFields suggested lastModifiedAt createdAt }\n            totalCount\n            page\n            size\n        }\n    }\n": typeof types.ManageAlbumsDocument,
    "\n    query ManageAlbum($id: ID!) {\n        album(id: $id) {\n            ...AlbumCardFields\n            description\n            suggested\n            trashedAt\n            createdAt\n            lastModifiedAt\n            visibilityCounts { visibility count }\n            items(page: 0, size: 500) { items { ...ItemFields fileSize trashedAt } totalCount page size }\n        }\n        albumKinds { id nameSv nameEn isDefault }\n        limits { maxUploadBytes maxVideoMinutes }\n    }\n": typeof types.ManageAlbumDocument,
    "\n    query AlbumKinds { albumKinds { id nameSv nameEn isDefault position albumCount } }\n": typeof types.AlbumKindsDocument,
    "\n    query AlbumTitles {\n        albums(page: 0, size: 500) { albums { id title dateFrom visibility } }\n    }\n": typeof types.AlbumTitlesDocument,
    "\n    query SpexSearch($q: String!) {\n        spexSearch(q: $q) { id title year revival parentId categoryName }\n    }\n": typeof types.SpexSearchDocument,
    "\n    query Contributions {\n        contributions { ...ItemFields fileSize }\n        albumSuggestions(open: true) {\n            id title suggestedBy status createdAt\n            album { id title dateFrom dateTo place description }\n        }\n    }\n": typeof types.ContributionsDocument,
    "\n    query Reports($open: Boolean) {\n        reports(open: $open) {\n            id reason message status reporter byVisitor outcome outcomeMessage createdAt handledAt\n            item { id caption type visibility effectiveVisibility media { thumbnailUrl expiresAt } album { id title } }\n        }\n    }\n": typeof types.ReportsDocument,
    "\n    query Unsorted { unsorted { date items { ...ItemFields } } }\n": typeof types.UnsortedDocument,
    "\n    query Trash {\n        trash {\n            albums { id title dateFrom trashedAt itemCount }\n            items { ...ItemFields trashedAt }\n        }\n    }\n": typeof types.TrashDocument,
    "\n    mutation AlbumCreate($input: AlbumInput!) { albumCreate(input: $input) { id } }\n": typeof types.AlbumCreateDocument,
    "\n    mutation AlbumUpdate($id: ID!, $input: AlbumInput!) { albumUpdate(id: $id, input: $input) { id } }\n": typeof types.AlbumUpdateDocument,
    "\n    mutation AlbumSetVisibility($id: ID!, $visibility: Visibility!, $items: Boolean) {\n        albumSetVisibility(id: $id, visibility: $visibility, items: $items) { id visibility }\n    }\n": typeof types.AlbumSetVisibilityDocument,
    "\n    mutation AlbumSetCover($id: ID!, $itemId: ID) { albumSetCover(id: $id, itemId: $itemId) { id } }\n": typeof types.AlbumSetCoverDocument,
    "\n    mutation AlbumTrash($id: ID!) { albumTrash(id: $id) { id } }\n": typeof types.AlbumTrashDocument,
    "\n    mutation AlbumRestore($id: ID!) { albumRestore(id: $id) { id } }\n": typeof types.AlbumRestoreDocument,
    "\n    mutation AlbumDelete($id: ID!, $keepItems: Boolean) { albumDelete(id: $id, keepItems: $keepItems) }\n": typeof types.AlbumDeleteDocument,
    "\n    mutation ItemsAdd($albumId: ID!, $uploadIds: [String!]!) {\n        itemsAdd(albumId: $albumId, uploadIds: $uploadIds) {\n            uploadId fileName outcome message existingAlbumTitle\n            item { id }\n            existingItem { id album { id title } }\n        }\n    }\n": typeof types.ItemsAddDocument,
    "\n    mutation ItemUpdate($id: ID!, $input: ItemInput!) { itemUpdate(id: $id, input: $input) { id } }\n": typeof types.ItemUpdateDocument,
    "\n    mutation ItemsUpdate($ids: [ID!]!, $input: ItemsInput!) { itemsUpdate(ids: $ids, input: $input) { id } }\n": typeof types.ItemsUpdateDocument,
    "\n    mutation ItemsTrash($ids: [ID!]!) { itemsTrash(ids: $ids) { id } }\n": typeof types.ItemsTrashDocument,
    "\n    mutation ItemsRestore($ids: [ID!]!) { itemsRestore(ids: $ids) { id } }\n": typeof types.ItemsRestoreDocument,
    "\n    mutation ItemsDelete($ids: [ID!]!) { itemsDelete(ids: $ids) }\n": typeof types.ItemsDeleteDocument,
    "\n    mutation ContributionsReview($itemIds: [ID!]!, $accept: Boolean!, $message: String) {\n        contributionsReview(itemIds: $itemIds, accept: $accept, message: $message) { id accepted }\n    }\n": typeof types.ContributionsReviewDocument,
    "\n    mutation AlbumSuggestionReview($id: ID!, $accept: Boolean!, $message: String) {\n        albumSuggestionReview(id: $id, accept: $accept, message: $message) { id status }\n    }\n": typeof types.AlbumSuggestionReviewDocument,
    "\n    mutation ReportHandle($id: ID!, $outcome: ReportOutcome!, $message: String) {\n        reportHandle(id: $id, outcome: $outcome, message: $message) { id status }\n    }\n": typeof types.ReportHandleDocument,
    "\n    mutation TrashEmpty { trashEmpty }\n": typeof types.TrashEmptyDocument,
};
const documents: Documents = {
    "\n    query AuditLog($page: Int, $size: Int, $filter: AuditFilter) {\n        auditLog(page: $page, size: $size, filter: $filter) {\n            totalCount page size\n            entries { id at actorId actorName action entityType entityId summary }\n        }\n    }\n": types.AuditLogDocument,
    "\n    query AuditActors { auditActors { id name } }\n": types.AuditActorsDocument,
    "\n    query Settings {\n        settings {\n            welcomeSv welcomeEn publicWelcomeSv publicWelcomeEn contactEmail maxUploadGb maxVideoMinutes\n            contributionMaxItems contributionMaxGb userDownloadsOriginals showPositions\n        }\n    }\n": types.SettingsDocument,
    "\n    mutation SettingsUpdate($input: SettingsInput!) { settingsUpdate(input: $input) { maxUploadGb } }\n": types.SettingsUpdateDocument,
    "\n    query MaintenanceJobs { maintenanceJobs { job schedule running lastStartedAt lastFinishedAt lastSucceeded } }\n": types.MaintenanceJobsDocument,
    "\n    mutation MaintenanceJobRun($job: MaintenanceJob!) { maintenanceJobRun(job: $job) }\n": types.MaintenanceJobRunDocument,
    "\n    query ImmichStatus {\n        immichStatus {\n            available version usedBytes availableBytes sizeBytes\n            queues { name paused active waiting failed }\n            failedItems { id caption type status failure originalFileName album { id title } media { thumbnailUrl expiresAt } }\n        }\n    }\n": types.ImmichStatusDocument,
    "\n    mutation ImmichJobRun($itemIds: [ID!]!, $job: ImmichJob!) { immichJobRun(itemIds: $itemIds, job: $job) }\n": types.ImmichJobRunDocument,
    "\n    mutation AlbumKindCreate($input: AlbumKindInput!) { albumKindCreate(input: $input) { id } }\n": types.AlbumKindCreateDocument,
    "\n    mutation AlbumKindUpdate($id: ID!, $input: AlbumKindInput!) { albumKindUpdate(id: $id, input: $input) { id } }\n": types.AlbumKindUpdateDocument,
    "\n    mutation AlbumKindsReorder($ids: [ID!]!) { albumKindsReorder(ids: $ids) { id } }\n": types.AlbumKindsReorderDocument,
    "\n    mutation AlbumKindDelete($id: ID!) { albumKindDelete(id: $id) }\n": types.AlbumKindDeleteDocument,
    "\n    fragment ItemFields on Item {\n        id\n        type\n        status\n        failure\n        takenAt\n        caption\n        photographer\n        latitude\n        longitude\n        width\n        height\n        durationMs\n        visibility\n        effectiveVisibility\n        contributionStatus\n        mine\n        uploadedBy\n        originalFileName\n        createdAt\n        album { id title visibility }\n        media { thumbnailUrl previewUrl videoUrl originalUrl expiresAt }\n    }\n": types.ItemFieldsFragmentDoc,
    "\n    fragment AlbumCardFields on Album {\n        id\n        title\n        dateFrom\n        dateTo\n        place\n        visibility\n        itemCount\n        kind { id nameSv nameEn }\n        spex { id title year revival parentId familyId categoryId categoryName }\n        cover { id caption type width height media { thumbnailUrl previewUrl expiresAt } }\n    }\n": types.AlbumCardFieldsFragmentDoc,
    "\n    query Me {\n        me { username displayName email roles }\n        limits { maxUploadBytes maxVideoMinutes contributionMaxItems contributionMaxGb canDownloadOriginals }\n    }\n": types.MeDocument,
    "\n    query Home {\n        startPage { welcome contactEmail }\n        recentAlbums(limit: 12) { ...AlbumCardFields }\n        thisDayInHistory(limit: 30) { ...ItemFields }\n        categories { id name albumCount }\n        years\n        albumKinds { id nameSv nameEn albumCount }\n        spexWithAlbums { id title year revival parentId familyId categoryName albumCount }\n    }\n": types.HomeDocument,
    "\n    query Browse($filter: AlbumFilter, $page: Int, $size: Int) {\n        albums(filter: $filter, page: $page, size: $size) {\n            albums { ...AlbumCardFields }\n            totalCount\n            page\n            size\n        }\n        categories { id name albumCount }\n        years\n        albumKinds { id nameSv nameEn albumCount }\n        spexWithAlbums { id title year revival parentId familyId categoryName albumCount }\n    }\n": types.BrowseDocument,
    "\n    query Album($id: ID!, $size: Int) {\n        album(id: $id) {\n            ...AlbumCardFields\n            description\n            createdAt\n            items(page: 0, size: $size) { items { ...ItemFields } totalCount page size }\n        }\n        limits { canDownloadOriginals }\n    }\n": types.AlbumDocument,
    "\n    query AlbumMeta($id: ID!) {\n        album(id: $id) {\n            id\n            title\n            description\n            visibility\n            dateFrom\n            cover { id caption effectiveVisibility media { previewUrl expiresAt } }\n        }\n    }\n": types.AlbumMetaDocument,
    "\n    query AlbumItems($id: ID!, $page: Int, $size: Int) {\n        album(id: $id) {\n            id\n            items(page: $page, size: $size) { items { ...ItemFields } totalCount page size }\n        }\n    }\n": types.AlbumItemsDocument,
    "\n    query Item($id: ID!) {\n        item(id: $id) { ...ItemFields }\n        limits { canDownloadOriginals }\n    }\n": types.ItemDocument,
    "\n    query ItemsById($ids: [ID!]!) {\n        publicItems(ids: $ids) { ...ItemFields }\n    }\n": types.ItemsByIdDocument,
    "\n    query SpexAlbums($spexId: ID!) {\n        spexAlbums(spexId: $spexId) { ...AlbumCardFields description }\n    }\n": types.SpexAlbumsDocument,
    "\n    query Search($q: String!) {\n        search(q: $q, limit: 60) {\n            albums { ...AlbumCardFields }\n            items { ...ItemFields }\n        }\n    }\n": types.SearchDocument,
    "\n    query SmartSearch($q: String!, $filter: AlbumFilter) {\n        smartSearch(q: $q, filter: $filter, limit: 60) { ...ItemFields }\n    }\n": types.SmartSearchDocument,
    "\n    query SearchFilters {\n        categories { id name albumCount }\n        years\n        albumKinds { id nameSv nameEn albumCount }\n    }\n": types.SearchFiltersDocument,
    "\n    query MapItems($filter: AlbumFilter) {\n        mapItems(filter: $filter) { id latitude longitude takenAt thumbnailUrl }\n    }\n": types.MapItemsDocument,
    "\n    query MyContributions {\n        myContributions { ...ItemFields }\n    }\n": types.MyContributionsDocument,
    "\n    query MySuggestions {\n        open: albumSuggestions(open: true) { id title status message createdAt handledAt album { id title } }\n        handled: albumSuggestions(open: false) { id title status message createdAt handledAt album { id title } }\n        albumKinds { id nameSv nameEn }\n    }\n": types.MySuggestionsDocument,
    "\n    fragment MyReport on Report {\n        id reason message status outcome outcomeMessage createdAt handledAt\n        item { id caption type media { thumbnailUrl expiresAt } album { id title } }\n    }\n": types.MyReportFragmentDoc,
    "\n    query MyReports {\n        open: reports(open: true, mine: true) { ...MyReport }\n        handled: reports(open: false, mine: true) { ...MyReport }\n    }\n": types.MyReportsDocument,
    "\n    query Contribute($id: ID!) {\n        album(id: $id) { id title visibility suggested }\n        limits { maxUploadBytes maxVideoMinutes contributionMaxItems contributionMaxGb }\n    }\n": types.ContributeDocument,
    "\n    mutation ReportCreate($input: ReportInput!) {\n        reportCreate(input: $input) { id status }\n    }\n": types.ReportCreateDocument,
    "\n    mutation ContributionsAdd($albumId: ID!, $uploadIds: [String!]!) {\n        contributionsAdd(albumId: $albumId, uploadIds: $uploadIds) {\n            uploadId fileName outcome message existingAlbumTitle\n            item { id }\n            existingItem { id album { id title } }\n        }\n    }\n": types.ContributionsAddDocument,
    "\n    mutation ContributionWithdraw($itemId: ID!) { contributionWithdraw(itemId: $itemId) }\n": types.ContributionWithdrawDocument,
    "\n    mutation AlbumSuggest($input: AlbumSuggestionInput!) {\n        albumSuggest(input: $input) { id album { id } }\n    }\n": types.AlbumSuggestDocument,
    "\n    query ManageAlbums($filter: AlbumFilter, $page: Int, $size: Int) {\n        albums(filter: $filter, page: $page, size: $size) {\n            albums { ...AlbumCardFields suggested lastModifiedAt createdAt }\n            totalCount\n            page\n            size\n        }\n    }\n": types.ManageAlbumsDocument,
    "\n    query ManageAlbum($id: ID!) {\n        album(id: $id) {\n            ...AlbumCardFields\n            description\n            suggested\n            trashedAt\n            createdAt\n            lastModifiedAt\n            visibilityCounts { visibility count }\n            items(page: 0, size: 500) { items { ...ItemFields fileSize trashedAt } totalCount page size }\n        }\n        albumKinds { id nameSv nameEn isDefault }\n        limits { maxUploadBytes maxVideoMinutes }\n    }\n": types.ManageAlbumDocument,
    "\n    query AlbumKinds { albumKinds { id nameSv nameEn isDefault position albumCount } }\n": types.AlbumKindsDocument,
    "\n    query AlbumTitles {\n        albums(page: 0, size: 500) { albums { id title dateFrom visibility } }\n    }\n": types.AlbumTitlesDocument,
    "\n    query SpexSearch($q: String!) {\n        spexSearch(q: $q) { id title year revival parentId categoryName }\n    }\n": types.SpexSearchDocument,
    "\n    query Contributions {\n        contributions { ...ItemFields fileSize }\n        albumSuggestions(open: true) {\n            id title suggestedBy status createdAt\n            album { id title dateFrom dateTo place description }\n        }\n    }\n": types.ContributionsDocument,
    "\n    query Reports($open: Boolean) {\n        reports(open: $open) {\n            id reason message status reporter byVisitor outcome outcomeMessage createdAt handledAt\n            item { id caption type visibility effectiveVisibility media { thumbnailUrl expiresAt } album { id title } }\n        }\n    }\n": types.ReportsDocument,
    "\n    query Unsorted { unsorted { date items { ...ItemFields } } }\n": types.UnsortedDocument,
    "\n    query Trash {\n        trash {\n            albums { id title dateFrom trashedAt itemCount }\n            items { ...ItemFields trashedAt }\n        }\n    }\n": types.TrashDocument,
    "\n    mutation AlbumCreate($input: AlbumInput!) { albumCreate(input: $input) { id } }\n": types.AlbumCreateDocument,
    "\n    mutation AlbumUpdate($id: ID!, $input: AlbumInput!) { albumUpdate(id: $id, input: $input) { id } }\n": types.AlbumUpdateDocument,
    "\n    mutation AlbumSetVisibility($id: ID!, $visibility: Visibility!, $items: Boolean) {\n        albumSetVisibility(id: $id, visibility: $visibility, items: $items) { id visibility }\n    }\n": types.AlbumSetVisibilityDocument,
    "\n    mutation AlbumSetCover($id: ID!, $itemId: ID) { albumSetCover(id: $id, itemId: $itemId) { id } }\n": types.AlbumSetCoverDocument,
    "\n    mutation AlbumTrash($id: ID!) { albumTrash(id: $id) { id } }\n": types.AlbumTrashDocument,
    "\n    mutation AlbumRestore($id: ID!) { albumRestore(id: $id) { id } }\n": types.AlbumRestoreDocument,
    "\n    mutation AlbumDelete($id: ID!, $keepItems: Boolean) { albumDelete(id: $id, keepItems: $keepItems) }\n": types.AlbumDeleteDocument,
    "\n    mutation ItemsAdd($albumId: ID!, $uploadIds: [String!]!) {\n        itemsAdd(albumId: $albumId, uploadIds: $uploadIds) {\n            uploadId fileName outcome message existingAlbumTitle\n            item { id }\n            existingItem { id album { id title } }\n        }\n    }\n": types.ItemsAddDocument,
    "\n    mutation ItemUpdate($id: ID!, $input: ItemInput!) { itemUpdate(id: $id, input: $input) { id } }\n": types.ItemUpdateDocument,
    "\n    mutation ItemsUpdate($ids: [ID!]!, $input: ItemsInput!) { itemsUpdate(ids: $ids, input: $input) { id } }\n": types.ItemsUpdateDocument,
    "\n    mutation ItemsTrash($ids: [ID!]!) { itemsTrash(ids: $ids) { id } }\n": types.ItemsTrashDocument,
    "\n    mutation ItemsRestore($ids: [ID!]!) { itemsRestore(ids: $ids) { id } }\n": types.ItemsRestoreDocument,
    "\n    mutation ItemsDelete($ids: [ID!]!) { itemsDelete(ids: $ids) }\n": types.ItemsDeleteDocument,
    "\n    mutation ContributionsReview($itemIds: [ID!]!, $accept: Boolean!, $message: String) {\n        contributionsReview(itemIds: $itemIds, accept: $accept, message: $message) { id accepted }\n    }\n": types.ContributionsReviewDocument,
    "\n    mutation AlbumSuggestionReview($id: ID!, $accept: Boolean!, $message: String) {\n        albumSuggestionReview(id: $id, accept: $accept, message: $message) { id status }\n    }\n": types.AlbumSuggestionReviewDocument,
    "\n    mutation ReportHandle($id: ID!, $outcome: ReportOutcome!, $message: String) {\n        reportHandle(id: $id, outcome: $outcome, message: $message) { id status }\n    }\n": types.ReportHandleDocument,
    "\n    mutation TrashEmpty { trashEmpty }\n": types.TrashEmptyDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query AuditLog($page: Int, $size: Int, $filter: AuditFilter) {\n        auditLog(page: $page, size: $size, filter: $filter) {\n            totalCount page size\n            entries { id at actorId actorName action entityType entityId summary }\n        }\n    }\n"): (typeof documents)["\n    query AuditLog($page: Int, $size: Int, $filter: AuditFilter) {\n        auditLog(page: $page, size: $size, filter: $filter) {\n            totalCount page size\n            entries { id at actorId actorName action entityType entityId summary }\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query AuditActors { auditActors { id name } }\n"): (typeof documents)["\n    query AuditActors { auditActors { id name } }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query Settings {\n        settings {\n            welcomeSv welcomeEn publicWelcomeSv publicWelcomeEn contactEmail maxUploadGb maxVideoMinutes\n            contributionMaxItems contributionMaxGb userDownloadsOriginals showPositions\n        }\n    }\n"): (typeof documents)["\n    query Settings {\n        settings {\n            welcomeSv welcomeEn publicWelcomeSv publicWelcomeEn contactEmail maxUploadGb maxVideoMinutes\n            contributionMaxItems contributionMaxGb userDownloadsOriginals showPositions\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation SettingsUpdate($input: SettingsInput!) { settingsUpdate(input: $input) { maxUploadGb } }\n"): (typeof documents)["\n    mutation SettingsUpdate($input: SettingsInput!) { settingsUpdate(input: $input) { maxUploadGb } }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query MaintenanceJobs { maintenanceJobs { job schedule running lastStartedAt lastFinishedAt lastSucceeded } }\n"): (typeof documents)["\n    query MaintenanceJobs { maintenanceJobs { job schedule running lastStartedAt lastFinishedAt lastSucceeded } }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation MaintenanceJobRun($job: MaintenanceJob!) { maintenanceJobRun(job: $job) }\n"): (typeof documents)["\n    mutation MaintenanceJobRun($job: MaintenanceJob!) { maintenanceJobRun(job: $job) }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query ImmichStatus {\n        immichStatus {\n            available version usedBytes availableBytes sizeBytes\n            queues { name paused active waiting failed }\n            failedItems { id caption type status failure originalFileName album { id title } media { thumbnailUrl expiresAt } }\n        }\n    }\n"): (typeof documents)["\n    query ImmichStatus {\n        immichStatus {\n            available version usedBytes availableBytes sizeBytes\n            queues { name paused active waiting failed }\n            failedItems { id caption type status failure originalFileName album { id title } media { thumbnailUrl expiresAt } }\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation ImmichJobRun($itemIds: [ID!]!, $job: ImmichJob!) { immichJobRun(itemIds: $itemIds, job: $job) }\n"): (typeof documents)["\n    mutation ImmichJobRun($itemIds: [ID!]!, $job: ImmichJob!) { immichJobRun(itemIds: $itemIds, job: $job) }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation AlbumKindCreate($input: AlbumKindInput!) { albumKindCreate(input: $input) { id } }\n"): (typeof documents)["\n    mutation AlbumKindCreate($input: AlbumKindInput!) { albumKindCreate(input: $input) { id } }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation AlbumKindUpdate($id: ID!, $input: AlbumKindInput!) { albumKindUpdate(id: $id, input: $input) { id } }\n"): (typeof documents)["\n    mutation AlbumKindUpdate($id: ID!, $input: AlbumKindInput!) { albumKindUpdate(id: $id, input: $input) { id } }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation AlbumKindsReorder($ids: [ID!]!) { albumKindsReorder(ids: $ids) { id } }\n"): (typeof documents)["\n    mutation AlbumKindsReorder($ids: [ID!]!) { albumKindsReorder(ids: $ids) { id } }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation AlbumKindDelete($id: ID!) { albumKindDelete(id: $id) }\n"): (typeof documents)["\n    mutation AlbumKindDelete($id: ID!) { albumKindDelete(id: $id) }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    fragment ItemFields on Item {\n        id\n        type\n        status\n        failure\n        takenAt\n        caption\n        photographer\n        latitude\n        longitude\n        width\n        height\n        durationMs\n        visibility\n        effectiveVisibility\n        contributionStatus\n        mine\n        uploadedBy\n        originalFileName\n        createdAt\n        album { id title visibility }\n        media { thumbnailUrl previewUrl videoUrl originalUrl expiresAt }\n    }\n"): (typeof documents)["\n    fragment ItemFields on Item {\n        id\n        type\n        status\n        failure\n        takenAt\n        caption\n        photographer\n        latitude\n        longitude\n        width\n        height\n        durationMs\n        visibility\n        effectiveVisibility\n        contributionStatus\n        mine\n        uploadedBy\n        originalFileName\n        createdAt\n        album { id title visibility }\n        media { thumbnailUrl previewUrl videoUrl originalUrl expiresAt }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    fragment AlbumCardFields on Album {\n        id\n        title\n        dateFrom\n        dateTo\n        place\n        visibility\n        itemCount\n        kind { id nameSv nameEn }\n        spex { id title year revival parentId familyId categoryId categoryName }\n        cover { id caption type width height media { thumbnailUrl previewUrl expiresAt } }\n    }\n"): (typeof documents)["\n    fragment AlbumCardFields on Album {\n        id\n        title\n        dateFrom\n        dateTo\n        place\n        visibility\n        itemCount\n        kind { id nameSv nameEn }\n        spex { id title year revival parentId familyId categoryId categoryName }\n        cover { id caption type width height media { thumbnailUrl previewUrl expiresAt } }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query Me {\n        me { username displayName email roles }\n        limits { maxUploadBytes maxVideoMinutes contributionMaxItems contributionMaxGb canDownloadOriginals }\n    }\n"): (typeof documents)["\n    query Me {\n        me { username displayName email roles }\n        limits { maxUploadBytes maxVideoMinutes contributionMaxItems contributionMaxGb canDownloadOriginals }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query Home {\n        startPage { welcome contactEmail }\n        recentAlbums(limit: 12) { ...AlbumCardFields }\n        thisDayInHistory(limit: 30) { ...ItemFields }\n        categories { id name albumCount }\n        years\n        albumKinds { id nameSv nameEn albumCount }\n        spexWithAlbums { id title year revival parentId familyId categoryName albumCount }\n    }\n"): (typeof documents)["\n    query Home {\n        startPage { welcome contactEmail }\n        recentAlbums(limit: 12) { ...AlbumCardFields }\n        thisDayInHistory(limit: 30) { ...ItemFields }\n        categories { id name albumCount }\n        years\n        albumKinds { id nameSv nameEn albumCount }\n        spexWithAlbums { id title year revival parentId familyId categoryName albumCount }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query Browse($filter: AlbumFilter, $page: Int, $size: Int) {\n        albums(filter: $filter, page: $page, size: $size) {\n            albums { ...AlbumCardFields }\n            totalCount\n            page\n            size\n        }\n        categories { id name albumCount }\n        years\n        albumKinds { id nameSv nameEn albumCount }\n        spexWithAlbums { id title year revival parentId familyId categoryName albumCount }\n    }\n"): (typeof documents)["\n    query Browse($filter: AlbumFilter, $page: Int, $size: Int) {\n        albums(filter: $filter, page: $page, size: $size) {\n            albums { ...AlbumCardFields }\n            totalCount\n            page\n            size\n        }\n        categories { id name albumCount }\n        years\n        albumKinds { id nameSv nameEn albumCount }\n        spexWithAlbums { id title year revival parentId familyId categoryName albumCount }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query Album($id: ID!, $size: Int) {\n        album(id: $id) {\n            ...AlbumCardFields\n            description\n            createdAt\n            items(page: 0, size: $size) { items { ...ItemFields } totalCount page size }\n        }\n        limits { canDownloadOriginals }\n    }\n"): (typeof documents)["\n    query Album($id: ID!, $size: Int) {\n        album(id: $id) {\n            ...AlbumCardFields\n            description\n            createdAt\n            items(page: 0, size: $size) { items { ...ItemFields } totalCount page size }\n        }\n        limits { canDownloadOriginals }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query AlbumMeta($id: ID!) {\n        album(id: $id) {\n            id\n            title\n            description\n            visibility\n            dateFrom\n            cover { id caption effectiveVisibility media { previewUrl expiresAt } }\n        }\n    }\n"): (typeof documents)["\n    query AlbumMeta($id: ID!) {\n        album(id: $id) {\n            id\n            title\n            description\n            visibility\n            dateFrom\n            cover { id caption effectiveVisibility media { previewUrl expiresAt } }\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query AlbumItems($id: ID!, $page: Int, $size: Int) {\n        album(id: $id) {\n            id\n            items(page: $page, size: $size) { items { ...ItemFields } totalCount page size }\n        }\n    }\n"): (typeof documents)["\n    query AlbumItems($id: ID!, $page: Int, $size: Int) {\n        album(id: $id) {\n            id\n            items(page: $page, size: $size) { items { ...ItemFields } totalCount page size }\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query Item($id: ID!) {\n        item(id: $id) { ...ItemFields }\n        limits { canDownloadOriginals }\n    }\n"): (typeof documents)["\n    query Item($id: ID!) {\n        item(id: $id) { ...ItemFields }\n        limits { canDownloadOriginals }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query ItemsById($ids: [ID!]!) {\n        publicItems(ids: $ids) { ...ItemFields }\n    }\n"): (typeof documents)["\n    query ItemsById($ids: [ID!]!) {\n        publicItems(ids: $ids) { ...ItemFields }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query SpexAlbums($spexId: ID!) {\n        spexAlbums(spexId: $spexId) { ...AlbumCardFields description }\n    }\n"): (typeof documents)["\n    query SpexAlbums($spexId: ID!) {\n        spexAlbums(spexId: $spexId) { ...AlbumCardFields description }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query Search($q: String!) {\n        search(q: $q, limit: 60) {\n            albums { ...AlbumCardFields }\n            items { ...ItemFields }\n        }\n    }\n"): (typeof documents)["\n    query Search($q: String!) {\n        search(q: $q, limit: 60) {\n            albums { ...AlbumCardFields }\n            items { ...ItemFields }\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query SmartSearch($q: String!, $filter: AlbumFilter) {\n        smartSearch(q: $q, filter: $filter, limit: 60) { ...ItemFields }\n    }\n"): (typeof documents)["\n    query SmartSearch($q: String!, $filter: AlbumFilter) {\n        smartSearch(q: $q, filter: $filter, limit: 60) { ...ItemFields }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query SearchFilters {\n        categories { id name albumCount }\n        years\n        albumKinds { id nameSv nameEn albumCount }\n    }\n"): (typeof documents)["\n    query SearchFilters {\n        categories { id name albumCount }\n        years\n        albumKinds { id nameSv nameEn albumCount }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query MapItems($filter: AlbumFilter) {\n        mapItems(filter: $filter) { id latitude longitude takenAt thumbnailUrl }\n    }\n"): (typeof documents)["\n    query MapItems($filter: AlbumFilter) {\n        mapItems(filter: $filter) { id latitude longitude takenAt thumbnailUrl }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query MyContributions {\n        myContributions { ...ItemFields }\n    }\n"): (typeof documents)["\n    query MyContributions {\n        myContributions { ...ItemFields }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query MySuggestions {\n        open: albumSuggestions(open: true) { id title status message createdAt handledAt album { id title } }\n        handled: albumSuggestions(open: false) { id title status message createdAt handledAt album { id title } }\n        albumKinds { id nameSv nameEn }\n    }\n"): (typeof documents)["\n    query MySuggestions {\n        open: albumSuggestions(open: true) { id title status message createdAt handledAt album { id title } }\n        handled: albumSuggestions(open: false) { id title status message createdAt handledAt album { id title } }\n        albumKinds { id nameSv nameEn }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    fragment MyReport on Report {\n        id reason message status outcome outcomeMessage createdAt handledAt\n        item { id caption type media { thumbnailUrl expiresAt } album { id title } }\n    }\n"): (typeof documents)["\n    fragment MyReport on Report {\n        id reason message status outcome outcomeMessage createdAt handledAt\n        item { id caption type media { thumbnailUrl expiresAt } album { id title } }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query MyReports {\n        open: reports(open: true, mine: true) { ...MyReport }\n        handled: reports(open: false, mine: true) { ...MyReport }\n    }\n"): (typeof documents)["\n    query MyReports {\n        open: reports(open: true, mine: true) { ...MyReport }\n        handled: reports(open: false, mine: true) { ...MyReport }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query Contribute($id: ID!) {\n        album(id: $id) { id title visibility suggested }\n        limits { maxUploadBytes maxVideoMinutes contributionMaxItems contributionMaxGb }\n    }\n"): (typeof documents)["\n    query Contribute($id: ID!) {\n        album(id: $id) { id title visibility suggested }\n        limits { maxUploadBytes maxVideoMinutes contributionMaxItems contributionMaxGb }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation ReportCreate($input: ReportInput!) {\n        reportCreate(input: $input) { id status }\n    }\n"): (typeof documents)["\n    mutation ReportCreate($input: ReportInput!) {\n        reportCreate(input: $input) { id status }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation ContributionsAdd($albumId: ID!, $uploadIds: [String!]!) {\n        contributionsAdd(albumId: $albumId, uploadIds: $uploadIds) {\n            uploadId fileName outcome message existingAlbumTitle\n            item { id }\n            existingItem { id album { id title } }\n        }\n    }\n"): (typeof documents)["\n    mutation ContributionsAdd($albumId: ID!, $uploadIds: [String!]!) {\n        contributionsAdd(albumId: $albumId, uploadIds: $uploadIds) {\n            uploadId fileName outcome message existingAlbumTitle\n            item { id }\n            existingItem { id album { id title } }\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation ContributionWithdraw($itemId: ID!) { contributionWithdraw(itemId: $itemId) }\n"): (typeof documents)["\n    mutation ContributionWithdraw($itemId: ID!) { contributionWithdraw(itemId: $itemId) }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation AlbumSuggest($input: AlbumSuggestionInput!) {\n        albumSuggest(input: $input) { id album { id } }\n    }\n"): (typeof documents)["\n    mutation AlbumSuggest($input: AlbumSuggestionInput!) {\n        albumSuggest(input: $input) { id album { id } }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query ManageAlbums($filter: AlbumFilter, $page: Int, $size: Int) {\n        albums(filter: $filter, page: $page, size: $size) {\n            albums { ...AlbumCardFields suggested lastModifiedAt createdAt }\n            totalCount\n            page\n            size\n        }\n    }\n"): (typeof documents)["\n    query ManageAlbums($filter: AlbumFilter, $page: Int, $size: Int) {\n        albums(filter: $filter, page: $page, size: $size) {\n            albums { ...AlbumCardFields suggested lastModifiedAt createdAt }\n            totalCount\n            page\n            size\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query ManageAlbum($id: ID!) {\n        album(id: $id) {\n            ...AlbumCardFields\n            description\n            suggested\n            trashedAt\n            createdAt\n            lastModifiedAt\n            visibilityCounts { visibility count }\n            items(page: 0, size: 500) { items { ...ItemFields fileSize trashedAt } totalCount page size }\n        }\n        albumKinds { id nameSv nameEn isDefault }\n        limits { maxUploadBytes maxVideoMinutes }\n    }\n"): (typeof documents)["\n    query ManageAlbum($id: ID!) {\n        album(id: $id) {\n            ...AlbumCardFields\n            description\n            suggested\n            trashedAt\n            createdAt\n            lastModifiedAt\n            visibilityCounts { visibility count }\n            items(page: 0, size: 500) { items { ...ItemFields fileSize trashedAt } totalCount page size }\n        }\n        albumKinds { id nameSv nameEn isDefault }\n        limits { maxUploadBytes maxVideoMinutes }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query AlbumKinds { albumKinds { id nameSv nameEn isDefault position albumCount } }\n"): (typeof documents)["\n    query AlbumKinds { albumKinds { id nameSv nameEn isDefault position albumCount } }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query AlbumTitles {\n        albums(page: 0, size: 500) { albums { id title dateFrom visibility } }\n    }\n"): (typeof documents)["\n    query AlbumTitles {\n        albums(page: 0, size: 500) { albums { id title dateFrom visibility } }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query SpexSearch($q: String!) {\n        spexSearch(q: $q) { id title year revival parentId categoryName }\n    }\n"): (typeof documents)["\n    query SpexSearch($q: String!) {\n        spexSearch(q: $q) { id title year revival parentId categoryName }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query Contributions {\n        contributions { ...ItemFields fileSize }\n        albumSuggestions(open: true) {\n            id title suggestedBy status createdAt\n            album { id title dateFrom dateTo place description }\n        }\n    }\n"): (typeof documents)["\n    query Contributions {\n        contributions { ...ItemFields fileSize }\n        albumSuggestions(open: true) {\n            id title suggestedBy status createdAt\n            album { id title dateFrom dateTo place description }\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query Reports($open: Boolean) {\n        reports(open: $open) {\n            id reason message status reporter byVisitor outcome outcomeMessage createdAt handledAt\n            item { id caption type visibility effectiveVisibility media { thumbnailUrl expiresAt } album { id title } }\n        }\n    }\n"): (typeof documents)["\n    query Reports($open: Boolean) {\n        reports(open: $open) {\n            id reason message status reporter byVisitor outcome outcomeMessage createdAt handledAt\n            item { id caption type visibility effectiveVisibility media { thumbnailUrl expiresAt } album { id title } }\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query Unsorted { unsorted { date items { ...ItemFields } } }\n"): (typeof documents)["\n    query Unsorted { unsorted { date items { ...ItemFields } } }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query Trash {\n        trash {\n            albums { id title dateFrom trashedAt itemCount }\n            items { ...ItemFields trashedAt }\n        }\n    }\n"): (typeof documents)["\n    query Trash {\n        trash {\n            albums { id title dateFrom trashedAt itemCount }\n            items { ...ItemFields trashedAt }\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation AlbumCreate($input: AlbumInput!) { albumCreate(input: $input) { id } }\n"): (typeof documents)["\n    mutation AlbumCreate($input: AlbumInput!) { albumCreate(input: $input) { id } }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation AlbumUpdate($id: ID!, $input: AlbumInput!) { albumUpdate(id: $id, input: $input) { id } }\n"): (typeof documents)["\n    mutation AlbumUpdate($id: ID!, $input: AlbumInput!) { albumUpdate(id: $id, input: $input) { id } }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation AlbumSetVisibility($id: ID!, $visibility: Visibility!, $items: Boolean) {\n        albumSetVisibility(id: $id, visibility: $visibility, items: $items) { id visibility }\n    }\n"): (typeof documents)["\n    mutation AlbumSetVisibility($id: ID!, $visibility: Visibility!, $items: Boolean) {\n        albumSetVisibility(id: $id, visibility: $visibility, items: $items) { id visibility }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation AlbumSetCover($id: ID!, $itemId: ID) { albumSetCover(id: $id, itemId: $itemId) { id } }\n"): (typeof documents)["\n    mutation AlbumSetCover($id: ID!, $itemId: ID) { albumSetCover(id: $id, itemId: $itemId) { id } }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation AlbumTrash($id: ID!) { albumTrash(id: $id) { id } }\n"): (typeof documents)["\n    mutation AlbumTrash($id: ID!) { albumTrash(id: $id) { id } }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation AlbumRestore($id: ID!) { albumRestore(id: $id) { id } }\n"): (typeof documents)["\n    mutation AlbumRestore($id: ID!) { albumRestore(id: $id) { id } }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation AlbumDelete($id: ID!, $keepItems: Boolean) { albumDelete(id: $id, keepItems: $keepItems) }\n"): (typeof documents)["\n    mutation AlbumDelete($id: ID!, $keepItems: Boolean) { albumDelete(id: $id, keepItems: $keepItems) }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation ItemsAdd($albumId: ID!, $uploadIds: [String!]!) {\n        itemsAdd(albumId: $albumId, uploadIds: $uploadIds) {\n            uploadId fileName outcome message existingAlbumTitle\n            item { id }\n            existingItem { id album { id title } }\n        }\n    }\n"): (typeof documents)["\n    mutation ItemsAdd($albumId: ID!, $uploadIds: [String!]!) {\n        itemsAdd(albumId: $albumId, uploadIds: $uploadIds) {\n            uploadId fileName outcome message existingAlbumTitle\n            item { id }\n            existingItem { id album { id title } }\n        }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation ItemUpdate($id: ID!, $input: ItemInput!) { itemUpdate(id: $id, input: $input) { id } }\n"): (typeof documents)["\n    mutation ItemUpdate($id: ID!, $input: ItemInput!) { itemUpdate(id: $id, input: $input) { id } }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation ItemsUpdate($ids: [ID!]!, $input: ItemsInput!) { itemsUpdate(ids: $ids, input: $input) { id } }\n"): (typeof documents)["\n    mutation ItemsUpdate($ids: [ID!]!, $input: ItemsInput!) { itemsUpdate(ids: $ids, input: $input) { id } }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation ItemsTrash($ids: [ID!]!) { itemsTrash(ids: $ids) { id } }\n"): (typeof documents)["\n    mutation ItemsTrash($ids: [ID!]!) { itemsTrash(ids: $ids) { id } }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation ItemsRestore($ids: [ID!]!) { itemsRestore(ids: $ids) { id } }\n"): (typeof documents)["\n    mutation ItemsRestore($ids: [ID!]!) { itemsRestore(ids: $ids) { id } }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation ItemsDelete($ids: [ID!]!) { itemsDelete(ids: $ids) }\n"): (typeof documents)["\n    mutation ItemsDelete($ids: [ID!]!) { itemsDelete(ids: $ids) }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation ContributionsReview($itemIds: [ID!]!, $accept: Boolean!, $message: String) {\n        contributionsReview(itemIds: $itemIds, accept: $accept, message: $message) { id accepted }\n    }\n"): (typeof documents)["\n    mutation ContributionsReview($itemIds: [ID!]!, $accept: Boolean!, $message: String) {\n        contributionsReview(itemIds: $itemIds, accept: $accept, message: $message) { id accepted }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation AlbumSuggestionReview($id: ID!, $accept: Boolean!, $message: String) {\n        albumSuggestionReview(id: $id, accept: $accept, message: $message) { id status }\n    }\n"): (typeof documents)["\n    mutation AlbumSuggestionReview($id: ID!, $accept: Boolean!, $message: String) {\n        albumSuggestionReview(id: $id, accept: $accept, message: $message) { id status }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation ReportHandle($id: ID!, $outcome: ReportOutcome!, $message: String) {\n        reportHandle(id: $id, outcome: $outcome, message: $message) { id status }\n    }\n"): (typeof documents)["\n    mutation ReportHandle($id: ID!, $outcome: ReportOutcome!, $message: String) {\n        reportHandle(id: $id, outcome: $outcome, message: $message) { id status }\n    }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation TrashEmpty { trashEmpty }\n"): (typeof documents)["\n    mutation TrashEmpty { trashEmpty }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;