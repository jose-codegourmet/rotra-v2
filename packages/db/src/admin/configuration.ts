import 'server-only'
import type { AdminContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { FeatureFlag, RankingPolicyVersion } from '../generated/prisma/client'
import { requireRevision } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { toDecimalString, toIso } from '../service/serialize'
import { recordAudit } from './audit'

const FLAG_KEY = /^[a-z][a-z0-9_]{2,39}$/

/** A flag is stored configuration only; nothing here implies a consumer reads it. */
function flagDto(flag: FeatureFlag) {
  return {
    key: flag.key,
    name: flag.name,
    description: flag.description,
    value: flag.value,
    updatedAt: toIso(flag.updatedAt),
    revision: toDecimalString(flag.revision),
  }
}

/** A saved policy version. It is never evidence that any rank was recalculated (#247). */
function policyDto(policy: RankingPolicyVersion) {
  return {
    id: policy.id,
    version: policy.version,
    effectiveAt: toIso(policy.effectiveAt),
    assessmentWeightBp: policy.assessmentWeightBp,
    performanceWeightBp: policy.performanceWeightBp,
    recentStandardMatchThreshold: policy.recentStandardMatchThreshold,
    algorithmVersion: policy.algorithmVersion,
    changeNote: policy.changeNote ?? '',
    createdAt: toIso(policy.createdAt),
  }
}

export async function readConfiguration(context: AdminContext) {
  void context
  const [flags, policies] = await Promise.all([
    prisma.featureFlag.findMany({ orderBy: { key: 'asc' } }),
    prisma.rankingPolicyVersion.findMany({ orderBy: { version: 'desc' } }),
  ])
  return { flags: flags.map(flagDto), rankingPolicies: policies.map(policyDto) }
}

/** A-CONFIG · New flag. The catalog starts empty; keys are owner-chosen, never invented here. */
export async function createFeatureFlag(
  context: AdminContext,
  input: { commandId: string; key: string; name: string; description: string },
) {
  const key = input.key.trim()
  const name = input.name.trim()
  if (!FLAG_KEY.test(key))
    throw new ServiceError('invalid', { key: 'Use 3–40 lowercase letters, digits or underscores.' })
  if (!name || name.length > 50) throw new ServiceError('invalid', { name: 'Enter a name up to 50 characters.' })
  try {
    return await prisma.$transaction(async (tx) => {
      const done = await tx.adminAuditEvent.findUnique({ where: { sourceCommandId: input.commandId } })
      if (done) return flagDto(await tx.featureFlag.findUniqueOrThrow({ where: { key: done.targetId } }))
      const flag = await tx.featureFlag.create({
        data: {
          key,
          name,
          description: input.description.trim(),
          createdByAdminId: context.adminId,
          updatedByAdminId: context.adminId,
        },
      })
      await recordAudit(tx, context, {
        action: 'flag.created',
        targetType: 'feature_flag',
        targetId: key,
        sourceCommandId: input.commandId,
        metadata: { value: false },
      })
      return flagDto(flag)
    })
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002')
      throw new ServiceError('conflict', { key: 'A flag with this key or name already exists.' })
    throw error
  }
}

/** A-CONFIG toggle under the loaded revision. */
export async function setFeatureFlag(
  context: AdminContext,
  input: { key: string; value: boolean; expectedRevision: string },
) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ key: string }[]>`
      SELECT "key" FROM "feature_flags" WHERE "key" = ${input.key} FOR UPDATE`
    if (!rows.length) throw new ServiceError('not_found')
    const flag = await tx.featureFlag.findUniqueOrThrow({ where: { key: input.key } })
    if (flag.value === input.value) return flagDto(flag)
    requireRevision(flag.revision, input.expectedRevision)
    const updated = await tx.featureFlag.update({
      where: { key: flag.key },
      data: { value: input.value, updatedByAdminId: context.adminId, revision: { increment: 1 } },
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
 * A-CONFIG · Ranking settings. Appends the next version under the expected current version, so two
 * owners saving at once cannot both win. Recalculation is a separate projection job (F07.30).
 */
export async function saveRankingPolicy(
  context: AdminContext,
  input: {
    commandId: string
    expectedVersion: number | null
    assessmentWeightBp: number
    recentStandardMatchThreshold: number
    algorithmVersion: string
    changeNote?: string
    effectiveAt?: string
  },
) {
  const assessment = input.assessmentWeightBp
  if (!Number.isInteger(assessment) || assessment < 0 || assessment > 10_000)
    throw new ServiceError('invalid', { weights: 'Weights must add up to 100%.' })
  const threshold = input.recentStandardMatchThreshold
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > 40)
    throw new ServiceError('invalid', { threshold: 'Enter between 1 and 40 matches.' })
  if (!input.algorithmVersion.trim())
    throw new ServiceError('invalid', { algorithm: 'Choose an approved algorithm version.' })
  return prisma.$transaction(async (tx) => {
    const done = await tx.adminAuditEvent.findUnique({ where: { sourceCommandId: input.commandId } })
    if (done)
      return policyDto(await tx.rankingPolicyVersion.findUniqueOrThrow({ where: { id: done.targetId } }))
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('ranking_policy_versions'))`
    const latest = await tx.rankingPolicyVersion.findFirst({ orderBy: { version: 'desc' } })
    if ((latest?.version ?? null) !== input.expectedVersion) throw new ServiceError('conflict')
    const now = new Date()
    const policy = await tx.rankingPolicyVersion.create({
      data: {
        version: (latest?.version ?? 0) + 1,
        effectiveAt: input.effectiveAt ? new Date(input.effectiveAt) : now,
        assessmentWeightBp: assessment,
        performanceWeightBp: 10_000 - assessment,
        recentStandardMatchThreshold: threshold,
        algorithmVersion: input.algorithmVersion.trim(),
        createdByAdminId: context.adminId,
        changeNote: input.changeNote?.trim() || null,
      },
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
