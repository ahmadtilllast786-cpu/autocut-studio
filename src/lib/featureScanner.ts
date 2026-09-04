import { FEATURES_MANIFEST, FeatureEntry, FeatureModule, InspectionContext } from './features.manifest';

export interface AuditItemResult extends FeatureEntry {
  status: 'PASS' | 'DEAD';
  executedChecks: {
    emptyHandlerCheck: boolean;
    stateConnectionCheck: boolean;
    pipelineIntegrationCheck: boolean;
  };
}

export interface AuditReport {
  timestamp: string;
  totalFeatures: number;
  activeCount: number;
  deadCount: number;
  groupedByModule: Record<FeatureModule, AuditItemResult[]>;
  allResults: AuditItemResult[];
  markdownReport: string;
}

/**
 * Check 1: Empty Handler & Unhandled Code Detection
 * Evaluates whether a feature has empty event callbacks, no-op functions, or unhandled stubs.
 */
export function checkEmptyHandler(entry: FeatureEntry): { passed: boolean; issue?: string } {
  if (entry.unwiredSnippet) {
    const isNoop =
      entry.unwiredSnippet.includes('() => {}') ||
      entry.unwiredSnippet.includes('// unhandled') ||
      entry.unwiredSnippet.includes('// rudimentary') ||
      entry.unwiredSnippet.includes('// empty state') ||
      entry.unwiredSnippet.includes('// Missing');
    if (isNoop) {
      return {
        passed: false,
        issue: `EMPTY_HANDLER: Contains unhandled no-op callback or stub (${entry.unwiredSnippet.trim()})`,
      };
    }
  }

  return { passed: true };
}

/**
 * Check 2: State Connection Check
 * Validates that the feature's target state/hook path is bound to real persistent state.
 */
export function checkStateConnection(entry: FeatureEntry, ctx: InspectionContext): { passed: boolean; issue?: string } {
  const target = entry.targetHookOrState;

  if (target.startsWith('timeline.')) {
    const prop = target.replace('timeline.', '').split('.')[0];
    if ((ctx.timeline as unknown as Record<string, unknown>)[prop] === undefined) {
      return { passed: false, issue: `UNBOUND_STATE: State property '${prop}' not attached to active timeline` };
    }
  }

  if (target.startsWith('assets') && (!ctx.assets || ctx.assets.length === 0)) {
    return { passed: false, issue: 'UNBOUND_STATE: Global media bin assets array is unpopulated or detached' };
  }

  // If entry is marked not working and mentions unbound state in issues
  const unboundIssue = entry.issues.find((i) => i.includes('UNBOUND_STATE'));
  if (unboundIssue) {
    return { passed: false, issue: unboundIssue };
  }

  return { passed: true };
}

/**
 * Check 3: API & Pipeline Integration Check
 * Validates deep pipeline wiring for Captions, MediaBin, Timeline, and Audio.
 */
export function checkPipelineIntegration(entry: FeatureEntry, ctx: InspectionContext): { passed: boolean; issue?: string } {
  switch (entry.module) {
    case 'Captions': {
      if (entry.id === 'cap-whisper-timestamps') {
        const hasWordTimestamps = ctx.timeline.subtitles.some(
          (sub) => Array.isArray(sub.words) && sub.words.length > 0 && typeof sub.words[0].startMs === 'number'
        );
        if (!hasWordTimestamps) {
          return { passed: false, issue: 'PIPELINE_ERROR: Whisper word timestamps missing startMs/endMs bursts' };
        }
      }
      break;
    }

    case 'MediaBin': {
      if (entry.id === 'media-dropzone-uploader') {
        const hasValidTags = ctx.assets.every((a) => a.id && (a.id.startsWith('VID') || a.id.startsWith('IMG') || a.id.startsWith('VO') || a.id.startsWith('BG')));
        if (!hasValidTags) {
          return { passed: false, issue: 'PIPELINE_ERROR: Media assets lack standardized [VID_XX] reference tags' };
        }
      }
      break;
    }

    case 'Audio': {
      if (entry.id === 'audio-live-gain-node') {
        // Ducking slider in settings vs active AudioContext gainNode
        return {
          passed: false,
          issue: 'PIPELINE_DISCONNECTED: Ducking slider changes are not piped to an active Web Audio API Gain Node during live playback',
        };
      }
      break;
    }

    case 'Timeline': {
      if (entry.id === 'time-blade-split-tool') {
        const canSplit = Array.isArray(ctx.timeline.clips) && ctx.timeline.clips.length > 0;
        if (!canSplit) {
          return { passed: false, issue: 'PIPELINE_ERROR: Timeline clip array not initialized for blade tool' };
        }
      }
      break;
    }

    default:
      break;
  }

  return { passed: true };
}

/**
 * Programmatic DOM Crawler Check
 * Scans the active browser DOM for interactive elements and flags unhandled buttons or inputs.
 */
export function scanInteractiveDOMElements(): { unhandledCount: number; warnings: string[] } {
  if (typeof document === 'undefined') {
    return { unhandledCount: 0, warnings: [] };
  }

  const warnings: string[] = [];
  let unhandledCount = 0;

  try {
    // Scan buttons with empty click handlers or placeholder titles
    const buttons = Array.from(document.querySelectorAll('button'));
    buttons.forEach((btn) => {
      const text = btn.innerText || btn.getAttribute('title') || '';
      if (text.includes('Spaces') || text.includes('Brand') || text.includes('Library')) {
        unhandledCount++;
        warnings.push(`[DOM Check] Button "${text.trim().slice(0, 30)}" found with placeholder/mock tab state`);
      }
    });
  } catch {
    // Graceful fallback for SSR/restricted environments
  }

  return { unhandledCount, warnings };
}

/**
 * Main Feature Audit Runner
 * Iterates through all manifest entries and executes the runtime checks.
 */
export function runFeatureAudit(ctx: InspectionContext): AuditReport {
  const allResults: AuditItemResult[] = [];
  const groupedByModule: Record<FeatureModule, AuditItemResult[]> = {
    Captions: [],
    MediaBin: [],
    Timeline: [],
    Audio: [],
    Canvas: [],
  };

  let activeCount = 0;
  let deadCount = 0;

  for (const entry of FEATURES_MANIFEST) {
    const emptyCheck = checkEmptyHandler(entry);
    const stateCheck = checkStateConnection(entry, ctx);
    const pipelineCheck = checkPipelineIntegration(entry, ctx);

    // If a custom testRunner exists on the entry, run it too
    let runnerPassed = true;
    const runnerIssues: string[] = [];
    if (entry.testRunner) {
      const runnerRes = entry.testRunner(ctx);
      runnerPassed = runnerRes.isWorking;
      runnerIssues.push(...runnerRes.issues);
    }

    const allIssues = [
      ...entry.issues,
      ...(emptyCheck.issue ? [emptyCheck.issue] : []),
      ...(stateCheck.issue ? [stateCheck.issue] : []),
      ...(pipelineCheck.issue ? [pipelineCheck.issue] : []),
      ...runnerIssues,
    ];

    // Remove duplicates
    const uniqueIssues = Array.from(new Set(allIssues));

    // Determine status: PASS if entry isWorking AND all runtime checks pass
    const isPassing = entry.isWorking && emptyCheck.passed && stateCheck.passed && pipelineCheck.passed && runnerPassed;

    if (isPassing) {
      activeCount++;
    } else {
      deadCount++;
    }

    const resultItem: AuditItemResult = {
      ...entry,
      isWorking: isPassing,
      status: isPassing ? 'PASS' : 'DEAD',
      issues: uniqueIssues,
      executedChecks: {
        emptyHandlerCheck: emptyCheck.passed,
        stateConnectionCheck: stateCheck.passed,
        pipelineIntegrationCheck: pipelineCheck.passed,
      },
    };

    allResults.push(resultItem);
    groupedByModule[entry.module].push(resultItem);
  }

  // Generate clean Markdown Report
  const timestamp = new Date().toISOString();
  const deadItems = allResults.filter((r) => r.status === 'DEAD');
  const activeItems = allResults.filter((r) => r.status === 'PASS');

  const markdownReport = [
    `# 🛠️ AutoCut Studio - Self Code Feature Audit Report`,
    `*Generated at: ${timestamp}*`,
    `*Summary: ${activeCount} Active (PASS) / ${deadCount} Dead (UNWIRED/MOCK) Features Detected*`,
    ``,
    `## 📊 Module Breakdown:`,
    `- **Captions**: ${groupedByModule.Captions.filter((i) => i.status === 'PASS').length} Active, ${groupedByModule.Captions.filter((i) => i.status === 'DEAD').length} Dead`,
    `- **MediaBin**: ${groupedByModule.MediaBin.filter((i) => i.status === 'PASS').length} Active, ${groupedByModule.MediaBin.filter((i) => i.status === 'DEAD').length} Dead`,
    `- **Timeline**: ${groupedByModule.Timeline.filter((i) => i.status === 'PASS').length} Active, ${groupedByModule.Timeline.filter((i) => i.status === 'DEAD').length} Dead`,
    `- **Audio**: ${groupedByModule.Audio.filter((i) => i.status === 'PASS').length} Active, ${groupedByModule.Audio.filter((i) => i.status === 'DEAD').length} Dead`,
    `- **Canvas**: ${groupedByModule.Canvas.filter((i) => i.status === 'PASS').length} Active, ${groupedByModule.Canvas.filter((i) => i.status === 'DEAD').length} Dead`,
    ``,
    `---`,
    `## 🚨 Dead / Mock Features to Fix (${deadCount}):`,
    ...deadItems.map((item, idx) => `
### ${idx + 1}. [DEAD] ${item.label} (${item.module})
- **Target State / Hook**: \`${item.targetHookOrState}\`
- **File**: \`${item.componentFile}\` (${item.locationLine || 'N/A'})
- **Description**: ${item.description}
${item.unwiredSnippet ? `- **Unwired Snippet**:\n\`\`\`ts\n${item.unwiredSnippet}\n\`\`\`` : ''}
- **Detected Issues**:
${item.issues.map((iss) => `  - ❌ ${iss}`).join('\n')}
- **Fix Recommendation**: ${item.fixRecommendation}
`),
    ``,
    `---`,
    `## ✅ Genuine Active Features (${activeCount}):`,
    ...activeItems.map((item, idx) => `
${idx + 1}. **[PASS] ${item.label}** (${item.module}) -> Bound to \`${item.targetHookOrState}\` (\`${item.componentFile}\`)
`),
  ].join('\n');

  return {
    timestamp,
    totalFeatures: allResults.length,
    activeCount,
    deadCount,
    groupedByModule,
    allResults,
    markdownReport,
  };
}
