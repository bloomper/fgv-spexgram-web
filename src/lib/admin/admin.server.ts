import "server-only";

import { graphql } from "@/gql";
import { runMutation, runQuery } from "@/lib/graphql.server";
import type { AlbumKindInput, AuditFilter, ImmichJob, MaintenanceJob, SettingsInput } from "@/gql/graphql";

const AuditLogQuery = graphql(`
    query AuditLog($page: Int, $size: Int, $filter: AuditFilter) {
        auditLog(page: $page, size: $size, filter: $filter) {
            totalCount page size
            entries { id at actorId actorName action entityType entityId summary }
        }
    }
`);
const AuditActorsQuery = graphql(`
    query AuditActors { auditActors { id name } }
`);
const SettingsQuery = graphql(`
    query Settings {
        settings {
            welcomeSv welcomeEn publicWelcomeSv publicWelcomeEn contactEmail maxUploadGb maxVideoMinutes
            contributionMaxItems contributionMaxGb userDownloadsOriginals showPositions
        }
    }
`);
const SettingsUpdateMutation = graphql(`
    mutation SettingsUpdate($input: SettingsInput!) { settingsUpdate(input: $input) { maxUploadGb } }
`);
const MaintenanceJobsQuery = graphql(`
    query MaintenanceJobs { maintenanceJobs { job schedule running lastStartedAt lastFinishedAt lastSucceeded } }
`);
const MaintenanceJobRunMutation = graphql(`
    mutation MaintenanceJobRun($job: MaintenanceJob!) { maintenanceJobRun(job: $job) }
`);
const ImmichStatusQuery = graphql(`
    query ImmichStatus {
        immichStatus {
            available version usedBytes availableBytes sizeBytes
            queues { name paused active waiting failed }
            failedItems { id caption type status failure originalFileName album { id title } media { thumbnailUrl expiresAt } }
        }
    }
`);
const ImmichJobRunMutation = graphql(`
    mutation ImmichJobRun($itemIds: [ID!]!, $job: ImmichJob!) { immichJobRun(itemIds: $itemIds, job: $job) }
`);
const AlbumKindCreateMutation = graphql(`
    mutation AlbumKindCreate($input: AlbumKindInput!) { albumKindCreate(input: $input) { id } }
`);
const AlbumKindUpdateMutation = graphql(`
    mutation AlbumKindUpdate($id: ID!, $input: AlbumKindInput!) { albumKindUpdate(id: $id, input: $input) { id } }
`);
const AlbumKindsReorderMutation = graphql(`
    mutation AlbumKindsReorder($ids: [ID!]!) { albumKindsReorder(ids: $ids) { id } }
`);
const AlbumKindDeleteMutation = graphql(`
    mutation AlbumKindDelete($id: ID!) { albumKindDelete(id: $id) }
`);

export const getAuditLog = async (page: number, size: number, filter: AuditFilter = {}) =>
  (await runQuery(AuditLogQuery, { page, size, filter }))?.auditLog;
export const getAuditActors = async () => (await runQuery(AuditActorsQuery, {}))?.auditActors ?? [];
export const getSettings = async () => (await runQuery(SettingsQuery, {}))?.settings;
export const settingsUpdate = (input: SettingsInput) => runMutation(SettingsUpdateMutation, { input });
export const getMaintenanceJobs = async () => (await runQuery(MaintenanceJobsQuery, {}))?.maintenanceJobs ?? [];
export const maintenanceJobRun = async (job: MaintenanceJob) =>
  Boolean((await runMutation(MaintenanceJobRunMutation, { job }))?.maintenanceJobRun);
export const getImmichStatus = async () => (await runQuery(ImmichStatusQuery, {}))?.immichStatus;
export const immichJobRun = (itemIds: string[], job: ImmichJob) => runMutation(ImmichJobRunMutation, { itemIds, job });
export const albumKindCreate = (input: AlbumKindInput) => runMutation(AlbumKindCreateMutation, { input });
export const albumKindUpdate = (id: string, input: AlbumKindInput) => runMutation(AlbumKindUpdateMutation, { id, input });
export const albumKindsReorder = (ids: string[]) => runMutation(AlbumKindsReorderMutation, { ids });
export const albumKindDelete = (id: string) => runMutation(AlbumKindDeleteMutation, { id });
