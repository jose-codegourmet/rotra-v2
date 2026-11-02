import 'server-only'
import {
  addFeatureFlagErrors,
  FEATURE_FLAG_KEY_TAKEN,
  trimFeatureFlagInput,
} from '@rotra/data/feature-flag/rules'
import { BASIS_POINTS_TOTAL, validateRankingDraft } from '@rotra/data/ranking-settings/rules'
import type { AdminContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { FeatureFlag, RankingPolicyVersion } from '../generated/prisma/client'
import { requireRevision } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { toDecimalString, toIso } from '../service/serialize'
import { recordAudit } from './audit'

/** The admin who acted, by display name: admin accounts store no email (same as license terms). */
const actor = { select: { displayName: true } } as const
const flagInclude = { createdBy: actor, updatedBy: actor } as const

type FlagRow = FeatureFlag & {
  createdBy?: { displayName: string } | null
  updatedBy?: { displayName: string } | null
}
type PolicyRow = RankingPolicyVersion & { createdBy?: { displayName: string } | null }

/**
 * A flag is stored configuration only; nothing here implies a consumer reads it. Adding a flag
 * counts as its first change, so `updatedAt`/`updatedByDisplayName` are always the last change.
 */
function flagDto(flag: FlagRow) {
  return {
    key: flag.key,
    name: flag.name,
    description: flag.description,
    value: flag.value,
    createdAt: toIso(flag.createdAt),
    createdByDisplayName: flag.createdBy?.displayName ?? '',
    updatedAt: toIso(flag.updatedAt),
    updatedByDisplayName: flag.updatedBy?.displayName ?? '',
    revision: toDecimalString(flag.revision),
  }
}

/** A saved policy version. It is never evidence that any rank was recalculated (#247). */
function policyDto(policy: PolicyRow) {
  return {
    id: policy.id,
    version: policy.version,
    effectiveAt: toIso(policy.effectiveAt),
    assessmentWeightBp: policy.assessmentWeightBp,
    performanceWeightBp: policy.performanceWeightBp,
    recentStandardMatchThreshold: policy.recentStandardMatchThreshold,
    algorithmVersion: policy.algorithmVersion,
    changeNote: policy.changeNote ?? '',
    /** Empty for the seeded version 1, which no admin saved. */
    createdByDisplayName: policy.createdBy?.displayName ?? '',
    createdAt: toIso(policy.createdAt),
  }
}

/** A-FEATURE-FLAGS: every flag, oldest added first (the list order). */
export async function readFeatureFlags(context: AdminContext) {
  void context
  const flags = await prisma.featureFlag.findMany({
    orderBy: [{ createdAt: 'asc' }, { key: 'asc' }],
    include: flagInclude,
  })
  return flags.map(flagDto)
}

/** A-RANK-CONFIG: every saved version, oldest first. */
export async function readRankingPolicies(context: AdminContext) {
  void context
  const policies = await prisma.rankingPolicyVersion.findMany({
    orderBy: { version: 'asc' },
    include: { createdBy: actor },
  })
  return policies.map(policyDto)
}

export async function readConfiguration(context: AdminContext) {
  const [flags, rankingPolicies] = await Promise.all([
    readFeatureFlags(context),
    readRankingPolicies(context),
  ])
  return { flags, rankingPolicies }
}

/**
 * A-ADD-FLAG · Add flag. The catalog starts empty; keys are owner-chosen, never invented here. The
 * same rules as the form (`@rotra/data/feature-flag/rules`): format errors are `invalid`, a name
 * taken ignoring case and accents or a taken key is `conflict`, both with fields keyed like the form.
 * New flags start off unless `value` is true ("Turn on right away").
 */
export async function createFeatureFlag(
  context: AdminContext,
  input: { commandId: string; key: string; name: string; description: string; value?: boolean },
) {
  const values = trimFeatureFlagInput({
    key: input.key,
    name: input.name,
    description: input.description,
    on: input.value === true,
  })
  const formatErrors = addFeatureFlagErrors(values, [])
  if (Object.keys(formatErrors).length) throw new ServiceError('invalid', formatErrors)
  try {
    return await prisma.$transaction(async (tx) => {
      const done = await tx.adminAuditEvent.findUnique({
        where: { sourceCommandId: input.commandId },
      })
      if (done)
        return flagDto(
          await tx.featureFlag.findUniqueOrThrow({
            where: { key: done.targetId },
            include: flagInclude,
          }),
        )
      const existing = await tx.featureFlag.findMany({ select: { key: true, name: true } })
      const takenErrors = addFeatureFlagErrors(values, existing)
      if (Object.keys(takenErrors).length) throw new ServiceError('conflict', takenErrors)
      const flag = await tx.featureFlag.create({
        data: {
          key: values.key,
          name: values.name,
          description: values.description,
          value: values.on,
          createdByAdminId: context.adminId,
          updatedByAdminId: context.adminId,
        },
        include: flagInclude,
      })
      await recordAudit(tx, context, {
        action: 'flag.created',
        targetType: 'feature_flag',
        targetId: flag.key,
        sourceCommandId: input.commandId,
        metadata: { value: flag.value },
      })
      return flagDto(flag)
    })
  } catch (error) {
    // A concurrent add of the same key or exact name lost the unique race.
    if ((error as { code?: string })?.code === 'P2002')
      throw new ServiceError('conflict', { key: FEATURE_FLAG_KEY_TAKEN })
    throw error
  }
}

/**
 * D-FLAG · Turn on / Turn off under the loaded revision. A stale revision is a `conflict` even when
 * the value already matches, so a confirmation opened on an older revision never passes silently.
 */
export async function setFeatureFlag(
  context: AdminContext,
  input: { key: string; value: boolean; expectedRevision: string },
) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ key: string }[]>`
      SELECT "key" FROM "feature_flags" WHERE "key" = ${input.key} FOR UPDATE`
    if (!rows.length) throw new ServiceError('not_found')
    const flag = await tx.featureFlag.findUniqueOrThrow({
      where: { key: input.key },
      include: flagInclude,
    })
    requireRevision(flag.revision, input.expectedRevision)
    if (flag.value === input.value) return flagDto(flag)
    const updated = await tx.featureFlag.update({
      where: { key: flag.key },
      data: { value: input.value, updatedByAdminId: context.adminId, revision: { increment: 1 } },
      include: flagInclude,
    })
    await recordAudit(tx, context, {
      action: 'flag.changed',
      targetType: 'feature_flag',
      targetId: flag.key,
      metadata: { before: flag.value, after: input.value },
    })
    return flagDto(updated)
  })
}

/**
 * D-CONFIG · Save configuration. Appends the next version under the expected current version, so
 * two owners saving at once cannot both win. Values are checked with the form's rules (fields keyed
 * like `RankingDraftErrors`). The algorithm reference is carried forward from the latest version
 * (`unapproved` until #247); the client never chooses it. Saving records configuration only:
 * recalculation is a separate projection job (F07.30) and retroactivity is open (#247).
 */
export async function saveRankingPolicy(
  context: AdminContext,
  input: {
    commandId: string
    expectedVersion: number | null
    assessmentWeightBp: number
    performanceWeightBp?: number
    recentStandardMatchThreshold: number
    changeNote?: string
    effectiveAt?: string
  },
) {
  const assessment = input.assessmentWeightBp
  const threshold = input.recentStandardMatchThreshold
  const errors = validateRankingDraft({
    assessmentWeightBp: assessment,
    performanceWeightBp: input.performanceWeightBp ?? BASIS_POINTS_TOTAL - assessment,
    recentStandardMatchThreshold: threshold,
  })
  if (Object.keys(errors).length) throw new ServiceError('invalid', errors)
  return prisma.$transaction(async (tx) => {
    const done = await tx.adminAuditEvent.findUnique({
      where: { sourceCommandId: input.commandId },
    })
    if (done)
      return policyDto(
        await tx.rankingPolicyVersion.findUniqueOrThrow({
          where: { id: done.targetId },
          include: { createdBy: actor },
        }),
      )
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('ranking_policy_versions'))`
    const latest = await tx.rankingPolicyVersion.findFirst({ orderBy: { version: 'desc' } })
    if ((latest?.version ?? null) !== input.expectedVersion) throw new ServiceError('conflict')
    const now = new Date()
    const policy = await tx.rankingPolicyVersion.create({
      data: {
        version: (latest?.version ?? 0) + 1,
        effectiveAt: input.effectiveAt ? new Date(input.effectiveAt) : now,
        assessmentWeightBp: assessment,
        performanceWeightBp: BASIS_POINTS_TOTAL - assessment,
        recentStandardMatchThreshold: threshold,
        algorithmVersion: latest?.algorithmVersion ?? 'unapproved',
        createdByAdminId: context.adminId,
        changeNote: input.changeNote?.trim() || null,
      },
      include: { createdBy: actor },
    })
    await recordAudit(tx, context, {
      action: 'ranking.policy_saved',
      targetType: 'ranking_policy_version',
      targetId: policy.id,
      sourceCommandId: input.commandId,
      metadata: { version: policy.version, assessmentWeightBp: assessment, threshold },
    })
    return policyDto(policy)
  })
}
