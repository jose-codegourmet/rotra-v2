'use client'
import { useMockMutation } from '../mock/query'
import { linkJoinRequest } from './requestDecisions'
/** Requests › Join › phone-match prompt › Link (toast “Linked to NAME”). */
export function useLinkJoinRequest() {
  return useMockMutation(linkJoinRequest)
}
