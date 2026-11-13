<template>
<section class="nx-flow nx-card" data-e2e="exam-flow">

    <!-- progress: Prepare -> Connect -> Running -> Hand-in -->
    <ol class="nx-flow-steps">
        <template v-for="(label, i) in stepLabels" :key="i">
            <li class="nx-step" :class="{ 'is-active': stepIndex === i, 'is-done': stepIndex > i }">
                <span class="nx-step-num"><template v-if="stepIndex > i">✓</template><template v-else>{{ i + 1 }}</template></span>
                <span class="nx-flow-step-label">{{ label }}</span>
            </li>
            <li v-if="i < stepLabels.length - 1" class="nx-step-line" :class="{ 'is-done': stepIndex > i }" aria-hidden="true"></li>
        </template>
    </ol>

    <div class="nx-flow-main">
        <!-- what to do now -->
        <div class="nx-flow-text">
            <h2 class="nx-h2">{{ title }}</h2>
            <p class="nx-muted nx-flow-desc">{{ description }}</p>

            <div v-if="phase === 'connect' || phase === 'prepare' || phase === 'ready'" class="nx-flow-pin">
                <span class="nx-flow-pin-label">{{ $t('nx.flow.pin') }}</span>
                <span class="nx-flow-pin-value" data-e2e="flow-pin">{{ pin }}</span>
                <span class="nx-pill" :class="reachable > 0 ? 'nx-pill--ok' : ''"><span class="nx-dot"></span>{{ reachable }} {{ $t('nx.flow.connected') }}</span>
            </div>
            <div v-else-if="phase === 'running'" class="nx-flow-pin">
                <span class="nx-pill nx-pill--ok"><span class="nx-dot"></span>{{ reachable }} {{ $t('nx.flow.students') }}</span>
            </div>
        </div>

        <!-- one big primary action -->
        <div class="nx-flow-primary">
            <button v-if="phase === 'running'" type="button" class="nx-btn nx-btn--danger nx-btn--lg" data-e2e="end-exam" @click="$emit('stop')">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                {{ $t('nx.flow.stopBtn') }}
            </button>
            <button v-else-if="phase === 'handin'" type="button" class="nx-btn nx-btn--primary nx-btn--lg" data-e2e="collect-files" @click="$emit('collect')">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></svg>
                {{ $t('nx.flow.collectBtn') }}
            </button>
            <button v-else type="button" class="nx-btn nx-btn--success nx-btn--lg" :class="{ 'is-disabled': !materialReady || reachable === 0 }" data-e2e="start-exam" @click="$emit('start')">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                {{ $t('nx.flow.startBtn') }}
            </button>
        </div>
    </div>

    <!-- secondary tools -->
    <div class="nx-flow-tools">
        <button type="button" class="nx-btn nx-btn--sm" data-e2e="send-files" @click="$emit('send')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            {{ $t('nx.flow.sendBtn') }}
        </button>
        <button v-if="phase !== 'handin'" type="button" class="nx-btn nx-btn--sm" data-e2e="collect-files" @click="$emit('collect')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></svg>
            {{ $t('nx.flow.collectBtn') }}
        </button>
        <button type="button" class="nx-btn nx-btn--sm" @click="$emit('submissions')">{{ $t('nx.flow.submissionsBtn') }}</button>
        <button type="button" class="nx-btn nx-btn--sm" @click="$emit('folder')">{{ $t('nx.flow.folderBtn') }}</button>
        <button type="button" class="nx-btn nx-btn--sm" @click="$emit('log')">{{ $t('nx.flow.logBtn') }}</button>
        <button type="button" class="nx-btn nx-btn--sm" :class="{ 'nx-btn--danger': screensLocked }" @click="$emit('lock', !screensLocked)">
            {{ screensLocked ? $t('nx.flow.unlockBtn') : $t('nx.flow.lockBtn') }}
        </button>

        <span class="nx-spacer"></span>
        <slot name="extra"></slot>

        <div class="nx-more" ref="more">
            <button type="button" class="nx-btn nx-btn--sm" aria-haspopup="true" :aria-expanded="moreOpen" @click.stop="moreOpen = !moreOpen">⋯ {{ $t('nx.flow.more') }}</button>
            <div v-if="moreOpen" class="nx-more-menu nx-card" @click="moreOpen = false">
                <button v-if="hasOffline" type="button" class="nx-more-item" @click="$emit('kick-offline')">{{ $t('dashboard.kickalloffline') }}</button>
                <button type="button" class="nx-more-item nx-more-danger" @click="$emit('clean')">{{ $t('dashboard.del') }}</button>
            </div>
        </div>
    </div>
</section>
</template>

<script>
/**
 * Guided exam flow bar for the teacher dashboard.
 * Pure presentation: derives the current phase from props and emits user intents; all logic stays in dashboard.vue.
 */
export default {
    name: 'ExamFlowBar',
    props: {
        exammode: { type: Boolean, default: false },
        hasStarted: { type: Boolean, default: false },     // an exam was already started at some point (-> hand-in phase once stopped)
        materialReady: { type: Boolean, default: false },
        reachable: { type: Number, default: 0 },
        pin: { type: [String, Number], default: '' },
        screensLocked: { type: Boolean, default: false },
        hasOffline: { type: Boolean, default: false },
    },
    emits: ['start', 'stop', 'collect', 'send', 'submissions', 'folder', 'log', 'lock', 'kick-offline', 'clean'],
    data() {
        return { moreOpen: false };
    },
    computed: {
        // prepare -> connect -> ready -> running -> handin
        phase() {
            if (this.exammode) return 'running';
            if (this.hasStarted) return 'handin';
            if (!this.materialReady) return 'prepare';
            return this.reachable > 0 ? 'ready' : 'connect';
        },
        stepIndex() {
            return { prepare: 0, connect: 1, ready: 1, running: 2, handin: 3 }[this.phase];
        },
        stepLabels() {
            return [this.$t('nx.flow.s1'), this.$t('nx.flow.s2'), this.$t('nx.flow.s3'), this.$t('nx.flow.s4')];
        },
        title() {
            return {
                prepare: this.$t('nx.flow.prep_t'),
                connect: this.$t('nx.flow.wait_t'),
                ready: this.$t('nx.flow.ready_t'),
                running: this.$t('nx.flow.run_t'),
                handin: this.$t('nx.flow.end_t'),
            }[this.phase];
        },
        description() {
            return {
                prepare: this.$t('nx.flow.prep_missing'),
                connect: this.$t('nx.flow.wait_d'),
                ready: this.$t('nx.flow.ready_d'),
                running: this.$t('nx.flow.run_d'),
                handin: this.$t('nx.flow.collectBtn'),
            }[this.phase];
        },
    },
    mounted() {
        this._close = () => { this.moreOpen = false; };
        document.addEventListener('click', this._close);
    },
    beforeUnmount() {
        document.removeEventListener('click', this._close);
    },
};
</script>

<style scoped>
.nx-flow { margin: 0 16px 12px 0; padding: 18px 22px 14px; flex-shrink: 0; font-family: 'Inter', system-ui, sans-serif; color: var(--nx-text); }
.nx-flow-steps { display: flex; align-items: center; list-style: none; margin: 0 0 14px; padding: 0; }
.nx-flow-steps .nx-step-line { flex: 0 1 60px; }
.nx-flow-main { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
.nx-flow-text { flex: 1 1 320px; min-width: 0; }
.nx-flow-desc { margin: 4px 0 0; font-size: .95rem; }
.nx-flow-pin { display: flex; align-items: center; gap: 12px; margin-top: 10px; }
.nx-flow-pin-label { font-size: .75rem; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; color: var(--nx-muted); }
.nx-flow-pin-value {
    font-size: 1.7rem; font-weight: 800; letter-spacing: .18em; padding: 2px 16px; border-radius: 12px;
    background: var(--nx-primary-50); color: var(--nx-primary); font-variant-numeric: tabular-nums;
}
.nx-flow-primary { flex: 0 0 auto; }
.nx-flow-tools { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--nx-border); }
.nx-spacer { flex: 1 1 auto; }
.nx-more { position: relative; }
.nx-more-menu { position: absolute; right: 0; top: calc(100% + 6px); z-index: 50; min-width: 260px; padding: 6px; }
.nx-more-item { display: block; width: 100%; text-align: left; padding: 10px 12px; border: 0; background: transparent; border-radius: 9px; font: inherit; font-size: .9rem; cursor: pointer; }
.nx-more-item:hover { background: var(--nx-surface-2); }
.nx-more-danger { color: var(--nx-danger); }
@media (max-width: 1100px) { .nx-flow-step-label { display: none; } }
</style>
