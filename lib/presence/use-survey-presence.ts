"use client";

import { useCallback, useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  PRESENCE_HEARTBEAT_MS,
  surveyPresenceChannel,
  type SurveyPresence,
} from "./survey-presence";

// Joins this survey's presence channel while the respondent is actually in
// the interview, and leaves it the moment they are not.
//
// Purely additive to the interview: it reads state the flow already keeps
// (response id, name, message count) and writes nothing back into it, so
// nothing the respondent sees depends on whether this succeeds. Every
// Realtime call is fire and forget for that reason: a failed track leaves
// the row missing from an internal dashboard, which is not worth surfacing
// to someone mid-interview.
export function useSurveyPresence({
  enabled,
  surveyId,
  slug,
  responseId,
  respondentName,
  currentStep,
}: {
  // False on the welcome/intake screens, in test mode, and once the
  // interview completes. Flipping it to false tears the channel down.
  enabled: boolean;
  surveyId: string;
  slug: string;
  responseId: string | null;
  respondentName: string;
  currentStep: number;
}) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  // track() is only legal once the channel reports SUBSCRIBED, and it is
  // called from a timer and from an effect that can both fire before that.
  const subscribedRef = useRef(false);
  // The values track() should publish, kept in a ref so the heartbeat timer
  // and the subscribe callback always read current data without either one
  // having to be torn down and recreated when a question is answered.
  const latestRef = useRef({ responseId, slug, respondentName, currentStep });

  const track = useCallback(() => {
    const channel = channelRef.current;
    const latest = latestRef.current;
    if (!channel || !subscribedRef.current || !latest.responseId) return;
    const payload: SurveyPresence = {
      response_id: latest.responseId,
      slug: latest.slug,
      respondent_name: latest.respondentName.trim() || null,
      current_step: latest.currentStep,
      last_active: new Date().toISOString(),
    };
    void channel.track(payload);
  }, []);

  // Declared before the channel effect so that on mount the ref is already
  // current by the time the subscription is opened. Republishing on every
  // step change (rather than waiting for the next heartbeat) is what makes
  // the admin view move in step with the respondent.
  useEffect(() => {
    latestRef.current = { responseId, slug, respondentName, currentStep };
    track();
  }, [responseId, slug, respondentName, currentStep, track]);

  useEffect(() => {
    if (!enabled || !responseId) return;

    const supabase = createClient();
    const channel = supabase.channel(surveyPresenceChannel(surveyId), {
      // Keyed by response id so a respondent who reconnects replaces their
      // own entry instead of appearing twice.
      config: { presence: { key: responseId } },
    });
    channelRef.current = channel;

    channel.subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      subscribedRef.current = true;
      track();
    });

    const heartbeat = setInterval(track, PRESENCE_HEARTBEAT_MS);

    // Closing the tab drops the socket, and Realtime turns that into a leave
    // event on its own, so this is belt and suspenders for the case where the
    // page is frozen into the back/forward cache instead of torn down (the
    // socket can linger there and the entry would sit stale until it times
    // out). pagehide rather than beforeunload: beforeunload is unreliable on
    // mobile Safari, which is where the interview mostly runs.
    function onPageHide() {
      void channel.untrack();
    }
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      clearInterval(heartbeat);
      subscribedRef.current = false;
      channelRef.current = null;
      // untrack first so watchers see a leave rather than a socket drop,
      // then close the channel regardless of whether that landed.
      void channel
        .untrack()
        .catch(() => {})
        .finally(() => {
          void supabase.removeChannel(channel);
        });
    };
  }, [enabled, responseId, surveyId, track]);
}
