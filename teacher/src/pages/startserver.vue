<template>
<div class="nx-app nx-start">

    <!-- top bar -->
    <header class="nx-topbar">
        <div class="nx-brand">
            <span class="nx-brand-mark">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>
            </span>
            Next-Exam
            <span class="nx-pill nx-pill--primary ms-1">Teacher</span>
        </div>
        <div class="nx-spacer"></div>

        <span v-if="!hostip" class="nx-pill nx-pill--bad"><span class="nx-dot"></span>{{ $t("general.offline") }}</span>
        <button v-else-if="hostip.interface" type="button" class="nx-pill nx-pill--ok nx-pill-btn" :title="$t('nx.wizard.changeNet')" @click="reconfigurePreferredInterface()">
            <span class="nx-dot"></span>{{ hostip.interface }} · {{ hostip.hostip }}
        </button>

        <button type="button" class="nx-btn nx-btn--ghost nx-btn--sm" :title="$t('startserver.languageinfo')" @click="toggleLocale">
            {{ inactivelocale.toUpperCase() }}
        </button>
    </header>

    <main class="nx-main">
        <div class="nx-container">

            <!-- local / bildungsportal switch -->
            <div v-if="config.bipIntegration" class="nx-center mb-4">
                <div class="nx-seg" role="tablist">
                    <button type="button" role="tab" :class="{ 'is-active': activeTab === 'pruefung' }" @click="switchTab('pruefung')">{{ $t('nx.wizard.tab_local') }}</button>
                    <button type="button" role="tab" :class="{ 'is-active': activeTab === 'bildungsportal' }" @click="switchTab('bildungsportal')">{{ $t('nx.wizard.tab_bip') }}</button>
                </div>
            </div>

            <div v-if="freeDiscspace < 0.1" class="nx-center mb-3">
                <span class="nx-pill nx-pill--warn">⚠ {{ $t("startserver.freespacewarning") }}</span>
            </div>

            <!-- ================= LOCAL EXAM WIZARD ================= -->
            <template v-if="activeTab === 'pruefung'">
            <section class="nx-card nx-card--pad nx-wizard">

                <div class="nx-stepper mb-4">
                    <div class="nx-step" :class="{ 'is-active': step === 1, 'is-done': step > 1, 'is-clickable': step > 1 }" @click="step > 1 && goStep(1)">
                        <span class="nx-step-num"><template v-if="step > 1">✓</template><template v-else>1</template></span>{{ $t('nx.wizard.step1') }}
                    </div>
                    <div class="nx-step-line" :class="{ 'is-done': step > 1 }"></div>
                    <div class="nx-step" :class="{ 'is-active': step === 2 }">
                        <span class="nx-step-num">2</span>{{ $t('nx.wizard.step2') }}
                    </div>
                </div>

                <Transition :name="stepDir === 'back' ? 'nx-slide-back' : 'nx-slide-fwd'" mode="out-in">

                <!-- STEP 1: name -->
                <div v-if="step === 1" key="s1">
                    <h1 class="nx-h1">{{ $t('nx.wizard.q1') }}</h1>
                    <p class="nx-lead">{{ $t('nx.wizard.q1hint') }}</p>

                    <div class="nx-field mt-4">
                        <label class="nx-label" for="servername">{{ $t('startserver.examname') }}</label>
                        <input id="servername" v-model="servername" type="text" maxlength="20" autocomplete="off" autocapitalize="off" spellcheck="false"
                               class="nx-input" :class="{ 'is-invalid': bipNameConflict }" placeholder="5a-mathematik"
                               @keypress="validateInput" @input="checkExistingExam" @paste="onServernamePasteOrDrop" @drop="onServernamePasteOrDrop" @dragover.prevent
                               @keyup.enter="canContinue && goStep(2)">
                        <div class="nx-hint" :class="{ 'is-error': bipNameConflict, 'is-ok': showServernameCharsetHint || (existingExam && !bipNameConflict) }">
                            <template v-if="bipNameConflict">⚠ {{ $t('startserver.bipNameConflictShort') }}</template>
                            <template v-else-if="showServernameCharsetHint">{{ $t('startserver.examnameCharsetHint') }}</template>
                            <template v-else-if="existingExam">✓ {{ $t('nx.wizard.sumResume') }}</template>
                        </div>
                    </div>

                    <div class="nx-actions mt-3">
                        <button id="examnext" type="button" class="nx-btn nx-btn--primary nx-btn--lg" :disabled="!canContinue" @click="goStep(2)" data-e2e="wizard-next">
                            {{ $t('nx.wizard.next') }}
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                        </button>
                    </div>
                </div>

                <!-- STEP 2: check + start -->
                <div v-else key="s2">
                    <h1 class="nx-h1">{{ $t('nx.wizard.q2') }}</h1>
                    <p class="nx-lead">{{ $t('nx.wizard.q2hint') }}</p>

                    <dl class="nx-summary mt-4">
                        <div><dt>{{ $t('nx.wizard.sumName') }}</dt>
                            <dd><b>{{ servername }}</b>
                                <span class="nx-pill ms-2" :class="existingExam ? 'nx-pill--warn' : 'nx-pill--primary'">{{ existingExam ? $t('nx.wizard.sumResume') : $t('nx.wizard.sumNew') }}</span></dd></div>
                        <div><dt>{{ $t('nx.wizard.sumNet') }}</dt>
                            <dd v-if="hostip && hostip.interface">{{ hostip.interface }} · {{ hostip.hostip }}</dd>
                            <dd v-else class="text-danger">{{ $t('nx.wizard.sumNetOffline') }}</dd></div>
                        <div><dt>{{ $t('nx.wizard.sumFolder') }}</dt>
                            <dd class="text-truncate" :title="backupdir || workdir">{{ backupdir || workdir }}</dd></div>
                    </dl>

                    <button type="button" class="nx-btn nx-btn--ghost nx-btn--sm mt-3" @click="showOptions = !showOptions">
                        {{ showOptions ? $t('nx.wizard.lessOptions') : $t('nx.wizard.moreOptions') }}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" :style="{ transform: showOptions ? 'rotate(180deg)' : '' }"><path d="M6 9l6 6 6-6"/></svg>
                    </button>

                    <Transition name="nx-fade-y">
                    <div v-if="showOptions" class="nx-options">
                        <div class="nx-field">
                            <label class="nx-label" for="examPassword">{{ $t('nx.wizard.pwdLead') }}</label>
                            <div class="nx-hint mb-1">{{ $t('nx.wizard.pwdLeadInfo') }}</div>
                            <div class="nx-pw-row">
                                <input id="examPassword" v-model="password" :type="showPassword ? 'text' : 'password'" class="nx-input nx-input--md" :disabled="passwordLocked" :placeholder="$t('startserver.pwd')" autocomplete="off">
                                <input v-model="passwordConfirm" :type="showPassword ? 'text' : 'password'" class="nx-input nx-input--md" :disabled="passwordLocked" :class="passwordMismatch ? 'is-invalid' : (passwordConfirm !== '' ? 'is-valid' : '')" :placeholder="$t('startserver.pwdconfirm')" autocomplete="off">
                                <button type="button" class="nx-btn nx-btn--icon" tabindex="-1" @click="togglePasswordVisibility" :title="showPassword ? 'Hide' : 'Show'">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/><path v-if="showPassword" d="M3 3l18 18"/></svg>
                                </button>
                            </div>
                            <div class="nx-hint is-error" v-if="passwordMismatch">⚠ {{ $t('startserver.pwdmismatch') }}</div>
                        </div>

                        <div class="nx-field mt-3">
                            <label class="nx-label">{{ $t('startserver.backupfolder') }}</label>
                            <div class="nx-hint mb-1">{{ $t('startserver.backupfolderinfo') }}</div>
                            <div class="nx-pw-row">
                                <div class="nx-path text-truncate" :title="backupdir">{{ backupdir || '—' }}</div>
                                <button id="backupdirbutton" type="button" class="nx-btn nx-btn--sm" @click="setBackupdir()">{{ $t('nx.wizard.changeFolder') }}</button>
                            </div>
                        </div>

                        <button type="button" class="nx-btn nx-btn--sm mt-3" :title="$t('dashboard.openEncryptedPdfTooltip')" @click="decryptEncryptedPdf()">{{ $t('dashboard.openEncryptedPdf') }}</button>
                    </div>
                    </Transition>

                    <div class="nx-actions mt-4">
                        <button type="button" class="nx-btn nx-btn--lg" @click="goStep(1)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
                            {{ $t('nx.wizard.back') }}
                        </button>
                        <button id="examstart" type="button" class="nx-btn nx-btn--success nx-btn--lg" :disabled="!hostip || startBlocked" @click="startServer()" data-e2e="wizard-start">
                            {{ existingExam ? $t('nx.wizard.goResume') : $t('nx.wizard.go') }}
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                        </button>
                    </div>
                </div>
                </Transition>
            </section>

            <!-- previous exams -->
            <section class="mt-5">
                <div class="nx-eyebrow mb-2">{{ $t('nx.wizard.recent') }}</div>
                <div v-if="!previousLocalExams.length" class="nx-muted">{{ $t('nx.wizard.recentEmpty') }}</div>
                <div class="nx-recent-grid">
                    <article v-for="exam of previousLocalExams" :key="`local-${exam.examName}`"
                             class="nx-card nx-card--interactive nx-exam" :class="{ 'nx-card--selected': servername === exam.examName, 'is-incompatible': !isExamVersionCompatible(exam) }"
                             :title="!isExamVersionCompatible(exam) ? $t('startserver.incompatible') : ''"
                             @click="isExamVersionCompatible(exam) && pickRecent(exam)">
                        <div class="nx-exam-head">
                            <b class="text-truncate">{{ exam.examName }}</b>
                            <div class="nx-exam-actions">
                                <button type="button" class="nx-btn nx-btn--ghost nx-btn--sm nx-btn--icon" :title="$t('startserver.duplicateinfo')" @click.stop="duplicateExam(exam)">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>
                                </button>
                                <button type="button" class="nx-btn nx-btn--ghost nx-btn--sm nx-btn--icon nx-danger-hover" :title="$t('startserver.deleteexaminfo')" @click.stop="delPreviousExam(exam.examName)">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                                </button>
                            </div>
                        </div>
                        <div class="nx-muted nx-exam-meta">
                            <span v-if="exam.examDate">{{ exam.examDate.slice(8,10) }}.{{ exam.examDate.slice(5,7) }}.{{ exam.examDate.slice(0,4) }}</span>
                            <span v-if="exam.examDurationMinutes">· {{ exam.examDurationMinutes }} {{ $t('nx.wizard.minutes') }}</span>
                        </div>
                        <div class="nx-exam-tags">
                            <span v-if="examTypeOf(exam)" class="nx-pill nx-pill--primary">{{ examTypeLabel(examTypeOf(exam)) }}</span>
                            <span v-if="exam.examSections && exam.examSections[exam.activeSection] && exam.examSections[exam.activeSection].groups" class="nx-pill">A/B</span>
                            <span v-if="exam.screenslocked" class="nx-pill nx-pill--bad">{{ $t('dashboard.lock') }}</span>
                        </div>
                    </article>
                </div>
            </section>
            </template>

            <!-- ================= BILDUNGSPORTAL ================= -->
            <template v-else>
            <section class="nx-card nx-card--pad nx-wizard">
                <template v-if="!bipToken">
                    <h1 class="nx-h1">{{ $t('dashboard.bildungsportal') }}</h1>
                    <p class="nx-lead">{{ $t('startserver.bippleaselogin') }}</p>
                    <div class="nx-actions mt-3">
                        <button id="biploginbutton" type="button" class="nx-btn nx-btn--primary nx-btn--lg" @click="loginBiP()">Login</button>
                    </div>
                </template>
                <template v-else>
                    <div class="d-flex align-items-start gap-3">
                        <div class="flex-grow-1">
                            <h1 class="nx-h1">{{ $t('startserver.bipwelcome') }}<template v-if="bipUsername">, {{ bipUsername }}</template>!</h1>
                            <p class="nx-lead">{{ $t('startserver.onlineexams') }}</p>
                        </div>
                        <button type="button" class="nx-btn nx-btn--sm" title="Refresh" @click="fetchBipExams">↻</button>
                        <button id="biploginbutton" type="button" class="nx-btn nx-btn--sm" title="logout" @click="logoutBiP()">Logout</button>
                    </div>

                    <div class="nx-recent-grid mt-4">
                        <article v-for="exam of onlineExams" :key="`bip-${exam.id}-${exam.examName}`"
                                 class="nx-card nx-card--interactive nx-exam" :class="{ 'nx-card--selected': servername === exam.examName, 'is-incompatible': !isExamVersionCompatible(exam) }"
                                 :title="!isExamVersionCompatible(exam) ? $t('startserver.incompatible') : ''"
                                 @click="isExamVersionCompatible(exam) && setOnlineExam(exam)">
                            <div class="nx-exam-head">
                                <b class="text-truncate">{{ exam.examName }}</b>
                                <span v-if="exam.pin" class="nx-pill">{{ exam.pin }}</span>
                            </div>
                            <div class="nx-muted nx-exam-meta">
                                <span v-if="exam.examDate">{{ exam.examDate.slice(8,10) }}.{{ exam.examDate.slice(5,7) }}.{{ exam.examDate.slice(0,4) }} {{ exam.examDate.slice(11,16) }}</span>
                                <span v-if="exam.examDurationMinutes">· {{ exam.examDurationMinutes }} {{ $t('nx.wizard.minutes') }}</span>
                            </div>
                            <div class="nx-exam-tags">
                                <span v-if="examTypeOf(exam)" class="nx-pill nx-pill--primary">{{ examTypeLabel(examTypeOf(exam)) }}</span>
                                <span v-if="exam.examStudents && exam.examStudents.length" class="nx-pill">{{ exam.examStudents.length }} SuS</span>
                            </div>
                        </article>
                    </div>

                    <div class="nx-actions mt-4">
                        <button id="examstart" type="button" class="nx-btn nx-btn--success nx-btn--lg" :disabled="!hostip || !servername || startBlocked" @click="startServer()">
                            {{ existingExam ? $t('nx.wizard.goResume') : $t('nx.wizard.go') }}
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                        </button>
                        <button id="bipcheck" type="button" class="nx-btn" @click="fetchBiPNews()">BiP News</button>
                    </div>
                </template>
            </section>

            <!-- BiP news -->
            <Transition name="nx-fade-y">
            <section v-if="BipInfoActive" id="bipinfo" class="nx-card nx-card--pad mt-4">
                <div class="nx-eyebrow mb-2">BiP News</div>
                <div v-if="bipnewsSorted.length == 0" class="nx-muted">{{ $t('startserver.noNews') }}</div>
                <div v-for="entry in bipnewsSorted" :key="entry.id" class="nx-news">
                    <b>{{ entry.subject }}</b>
                    <div v-if="entry.message" v-external-links v-html="entry.message"></div>
                    <div class="nx-muted nx-exam-meta">{{ formatUnixDate(entry.timecreated) }} | {{ entry.author.fullname }}</div>
                </div>
            </section>
            </Transition>
            </template>

        </div>
    </main>

    <footer class="nx-foot">
        <span class="nx-foot-link" @click="showCopyleft()"><span style="display:inline-block; transform: scaleX(-1);">&copy;</span> {{ version }} {{ info }}</span>
    </footer>

    <Transition name="nx-toast">
        <div v-if="toast" class="nx-toast" role="status">{{ toast }}</div>
    </Transition>
</div>
</template>


<script lang="ts">
import log from 'electron-log/renderer';
import {SchedulerService} from '../utils/schedulerservice.js'
import {Exam} from "../types/api";
import {extractDomainAndId} from '../utils/examsetup.js'


// Capture unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  log.error('startserver @ unhandledrejection:', event.reason);
});

Object.assign(console, log.functions);





export default {
    data() {
        return {
            version: this.$route.params.version,
            info: config.info,
            config: this.$route.params.config,  // warning: config contains recursive elements, copied in ipchandler.copyConfig()
            buildDate: this.$route.params.config.buildDate,
            title: document.title,
            servername : this.$route.params.config.development ? "test-exam":"",
            password: "",
            passwordConfirm: "",
            prod : false,
            serverApiPort: this.$route.params.serverApiPort,
            electron: this.$route.params.electron,
            hostname: window.location.hostname,
            hostip: this.$route.params.config.hostip,
            step: 1,
            stepDir: 'forward',
            showOptions: false,
            existingExam: null as any,
            toast: '',
            toastTimer: null as any,
            showPassword: false,
            workdir: this.$route.params.config.workdirectory,
            backupdir: '',
            freeDiscspace: 100,
            previousExams: [],
            onlineExams: [] as Exam[],
            biptest:false,   //switches between production and q
            selectedExam: null,
            bipNameConflict: false,
            showServernameCharsetHint: false,
            servernameCharsetHintTimer: null,

            bipToken:this.$route.params.bipToken === 'false' || !this.$route.params.bipToken ?  false : this.$route.params.bipToken,   // params are always passed as string "false", convert to bool
            bipuserID: this.$route.params.bipuserID === 'false' || !this.$route.params.bipuserID ?  false : this.$route.params.bipuserID,
            bipUsername:this.$route.params.bipUsername === 'false' || !this.$route.params.bipUsername ?  false : this.$route.params.bipUsername,


            bipnews: [],
            BipInfoActive: false,
            activeTab: 'pruefung',
        };
    },
    components: {},
    directives: {
        // Finds all <a> tags and adds target="_blank" (e.g. for Digi4school books that must open in a popup)
        externalLinks: {
            mounted(el) {
                // Runs on first render (Vue 3 uses "mounted" instead of "inserted")
                const links = el.querySelectorAll("a");
                links.forEach(link => {
                    link.setAttribute("target", "_blank");
                    link.setAttribute("rel", "noopener noreferrer");
                });

            },
            updated(el) {
                // Also runs on content updates
                const links = el.querySelectorAll("a");
                links.forEach(link => {
                    link.setAttribute("target", "_blank");
                    link.setAttribute("rel", "noopener noreferrer");
                });
            }
        }
    },
    computed: {
        inactivelocale() { // Returns the inactive locale code
             return this.$i18n.locale === 'de' ? 'en' : 'de';
        },
        previousLocalExams() {
            return (this.previousExams || []).filter(exam => !exam?.bip);
        },
        previousBipExams() {
            return (this.previousExams || []).filter(exam => !!exam?.bip);
        },
        passwordMismatch() {
            return this.password !== this.passwordConfirm;
        },
        // BiP forum posts newest first (timecreated is Unix seconds from Moodle API).
        bipnewsSorted() {
            return [...(this.bipnews || [])].sort(
                (a, b) => (Number(b.timecreated) || 0) - (Number(a.timecreated) || 0)
            );
        },
        // True while exam name or the advanced exam password is missing/mismatched (start/resume must stay locked).
        startBlocked() {
            if (!this.servername) { return true; }
            if (this.bipNameConflict) { return true; }
            if (this.existingExam && !this.isExamVersionCompatible(this.existingExam)) { return true; }
            return this.passwordMismatch;
        },
        // name is valid enough to leave step 1
        canContinue() {
            return !!this.servername && !this.bipNameConflict && !(this.existingExam && !this.isExamVersionCompatible(this.existingExam));
        },
        // an existing exam with a stored password keeps it (field is locked)
        passwordLocked() {
            return !!this.existingExam && typeof this.existingExam.examPassword === 'string' && this.existingExam.examPassword.trim() !== '';
        },
        // Password sent to control API / dashboard when the user leaves advanced empty (legacy default).
        effectiveExamPassword() {
            return this.password || "next-exam";
        }
    },

    methods: {
        // True when exam nextexamVersion major matches the running teacher build.
        isExamVersionCompatible(exam) {
            const examVersion = exam?.nextexamVersion;
            if (!examVersion || !this.version) return false;
            return examVersion.slice(0, 3) === this.version.slice(0, 3);
        },

        formatUnixDate(value) {
            if (!value) return "";
            // If timestamp is in seconds (10 digits), multiply by 1000
            let timestamp = Number(value);
            if (timestamp < 10000000000) {
                timestamp *= 1000;
            }
            const date = new Date(timestamp);
            const day = date.getDate().toString().padStart(2, "0");
            const month = (date.getMonth() + 1).toString().padStart(2, "0");
            const year = date.getFullYear();
            return `${day}.${month}.${year}`;
        },


        // wizard navigation
        goStep(n) {
            this.stepDir = n < this.step ? 'back' : 'forward';
            this.step = n;
            if (n === 1) { this.$nextTick(() => document.getElementById('servername')?.focus()); }
        },

        switchTab(tab) {
            this.activeTab = tab;
            this.selectedExam = null; this.servername = ''; this.password = ''; this.passwordConfirm = '';
            this.showOptions = false;
            this.step = 1;
            this.checkExistingExam();
        },

        // click on a previous exam card: take over the name and jump to the start step
        async pickRecent(exam) {
            await this.setPreviousExam(exam);
            if (this.canContinue) this.goStep(2);
        },

        examTypeOf(exam) {
            return exam?.examSections?.[exam.activeSection]?.examtype || '';
        },
        examTypeLabel(type) {
            const map = {
                math: this.$t('dashboard.math'), editor: this.$t('dashboard.lang'), eduvidual: this.$t('dashboard.eduvidual'),
                forms: this.$t('dashboard.forms'), website: 'Website', activesheets: 'Active Sheets',
                microsoft365: this.$t('dashboard.microsoft365'), rdp: 'RDP',
            };
            return map[type] || type;
        },

        toggleLocale() {
            // Toggle between 'de' and 'en'
            this.$i18n.locale = this.$i18n.locale === 'de' ? 'en' : 'de';
        },

        loginBiP(){
            let IPCresponse = ipcRenderer.sendSync('loginBiP', this.biptest)
            console.log(IPCresponse)
        },

        logoutBiP(){
            this.$swal.fire({
                title: this.$t("dashboard.bildungsportal"),
                text:  this.$t("dashboard.logoutBiP"),
                showCancelButton: true,
                confirmButtonText: 'Ok',
                cancelButtonText: this.$t("dashboard.cancel"),
                focusConfirm: false,
                icon: 'question',
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        await ipcRenderer.invoke('clearBipPortalSession', this.biptest)
                    } catch (e) {
                        console.warn('startserver @ logoutBiP: clearBipPortalSession', e)
                    }
                    this.bipToken = false
                    this.bipUsername = false
                    this.bipuserID = false
                    this.bipData = null
                    this.onlineExams = []
                    this.$router.replace({ path: '/' })
                } 
            });
        },

        getBiPUrl(): string {
            const url = this.config.bipDemo ? this.config.demoBipApiUrl : this.config.bipApiUrl;
            return this.biptest ? url.replace('//www.', '//q.') : url;
        },

        /**
         * Fetches user data once the login token has been received.
         * @param base64String contains 2 base64 encoded tokens
         */
        fetchBiPData(base64String){
            let token = this.decodeBase64AndExtractTokens(base64String)?.[1];
            if (!token) {
                throw Error("cannot fetch from bip api without valid token")
            }

            const url = this.getBiPUrl() + '?wstoken=' + token + '&wsfunction=core_webservice_get_site_info&moodlewsrestformat=json';

            fetch(url, { method: 'POST'})
            .then( res => res.json() )
            .then( response => {
                if (response.fullname){
                    this.$swal.fire({
                        title: this.$t("dashboard.bildungsportal"),
                        text: "Verbindung hergestellt",
                        icon: 'info',
                        showCancelButton: false,
                    })

                    //log.info('startserver @ fetchBiPData: BiP data fetched', response)

                    
                    this.bipUsername = response.fullname
                    this.bipuserID = response.userid


                    this.fetchBipExams()
                }
                else {
                    this.$swal.fire({
                        title: this.$t("dashboard.bildungsportal"),
                        text: "Verbindung konnte nicht hergestellt werden",
                        icon: 'info',
                        showCancelButton: false,
                    })

                }
            })
            .catch(err => { console.warn(err) })
        },

        /**
         * Fetches pre-configured exams from the Bildungsportal via BiP API.
         */
        fetchBipExams(){
            let token = this.decodeBase64AndExtractTokens(this.bipToken)?.[1];
            if (!token) {
                return;
            }

            const url = this.getBiPUrl();
            const body = new URLSearchParams({
                wstoken: token,
                wsfunction: 'local_dpu_get_exams_teacher',
                moodlewsrestformat: 'json',
            });

            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body.toString(),
            })
            .then(response => response.json())
            .then(data => {
                if (data?.exception || data?.errorcode) {
                    console.error('startserver @ fetchBipExams: Moodle API error', data);
                    this.$swal.fire({
                        title: this.$t('startserver.bipExamListFailedTitle'),
                        html: `${this.$t('startserver.bipExamListFailedBody')}<br><br><small class="text-muted">${data.message || ''} (${data.errorcode || ''})</small>`,
                        icon: 'error',
                    });
                    return;
                }
                this.bipData = data;
                this.onlineExams.splice(0);
                this.onlineExams.push(...(Array.isArray(data.exams) ? data.exams : []));

                this.computeSebConfigForOnlineExams();
                 
            })
            .catch(error => { console.error('startserver @ fetchBipExams:', error); });
        },
        
        computeSebConfigForOnlineExams() {
            for (const [examkey, exam] of Object.entries(this.onlineExams)) {
                for (let i = 1; i <= 4; i++) {
                    if (exam.examSections[i].examtype === 'eduvidual') {
                        for (let group of ['groupA', 'groupB']) {
                            const config = exam.examSections[i][group].examConfig.eduvidual;
                            if (config.sebConfigFile != null) {
                                window.ipcRenderer?.invoke?.('loadSEBConfig', config.sebConfigFile, config.sebConfigPassword, config.sebConfigBek).then((sebConfig) => {
                                    if (sebConfig != null) {
                                        const url = sebConfig.sebConfig.startURL;
                                        const {moodledomain, testid} = extractDomainAndId(url);
                                        Object.assign(this.onlineExams[examkey].examSections[i][group].examConfig.eduvidual, {...sebConfig, url, moodleDomain: moodledomain, moodleTestId: testid});
                                    } else {
                                        let html = this.$t('startserver.bipExamSebConfigLoadingFailed') + `<br><br>${this.onlineExams[examkey].examName}`;
                                        if (this.onlineExams[examkey].useExamSections) html += ' -> ' + this.onlineExams[examkey].examSections[i].sectionname;
                                        if (this.onlineExams[examkey].examSections[i].groups) html += ' -> ' + this.$t('dashboard.' + group);
                                        html += '<br><br>' + this.$t('startserver.bipExamSebConfigLoadingFailedReason');
                                        this.$swal.fire({title: this.$t('startserver.bipExamSebConfigLoadingFailedTitle'), html: html, icon: 'error'});
                                    }
                                });
                            }
                        }
                    }
                }
            }
        },

        async setOnlineExam(exam){
            if (!this.isExamVersionCompatible(exam)) {
                this.status(this.$t('startserver.incompatible'));
                return;
            }
            this.servername = exam.examName

            this.selectedExam = { ...exam, bip: true }  // mark as bip exam for consistent tab-based start logic

            // save the selected exam information to local serverstatus.json / create local exam folder
            this.bipData.exams.forEach(bipexam =>{
                if (bipexam.examName === exam.examName){
                    ipcRenderer.invoke('createBipExamdirectory', bipexam)
                }
            }) 

            // keep button state consistent with "Local Exam" tab
            await this.checkExistingExam()
        },



        fetchBiPNews(){
            let token = "6ca93a5f05a4d08a6c85fbeba707cc45"
            let forumid = 4
            let cmid = 40
            let groupid = 10
            let url = `${this.getBiPUrl()}?wstoken=${token}&wsfunction=mod_forum_get_forum_discussions&moodlewsrestformat=json&forumid=${forumid}&groupid=${groupid}`

            //get moodle information about the forum with the given cmid (id on website) to get the actual forumid for the api call
            //let url = `https://www.bildung.gv.at/webservice/rest/server.php?wstoken=${token}&wsfunction=core_course_get_course_module&moodlewsrestformat=json&cmid=${cmid}`

            // First get all discussions from the forum
            fetch(url, { method: 'POST'})
            .then(res => res.json())
            .then(discussionsResponse => {
                if (discussionsResponse.discussions && discussionsResponse.discussions.length > 0) {
                    // Initialize empty array for all posts
                    let allPosts = [];
                    
                    // Process each discussion one by one
                    let processedDiscussions = 0;

                    discussionsResponse.discussions.forEach(discussion => {
                        let discussionid = discussion.discussion; // Use discussion.discussion instead of discussion.id
                        let url1 = `${this.getBiPUrl()}?wstoken=${token}&wsfunction=mod_forum_get_discussion_posts&moodlewsrestformat=json&discussionid=${discussionid}`;
                        
                        fetch(url1, { method: 'POST'})
                        .then(res => res.json())
                        .then(response => {
                            if (response.posts && response.posts.length > 0) {
                                // Add all posts from this discussion to our array
                                allPosts = allPosts.concat(response.posts);
                            }
                            
                            processedDiscussions++;
                            
                            // When all discussions are processed, update bipnews
                            if (processedDiscussions === discussionsResponse.discussions.length) {
                                this.bipnews = allPosts;
                                
                                // Toggle UI visibility
                                this.BipInfoActive = !this.BipInfoActive;
                            }
                        })
                        .catch(err => { 
                            console.warn(`Error fetching posts for discussion ${discussionid}:`, err);
                            processedDiscussions++;
                            
                            // Still check if all discussions are processed
                            if (processedDiscussions === discussionsResponse.discussions.length) {
                                this.bipnews = allPosts;
                                
                                // Toggle UI visibility
                                this.BipInfoActive = !this.BipInfoActive;
                            }
                        });
                    });
                } else {
                    this.bipnews = [];
                    
                    // Toggle UI visibility
                    this.BipInfoActive = !this.BipInfoActive;
                }
            })
            .catch(err => { console.warn(err) })
        },




        // Check if a string is Base64-encoded
        isBase64(str) {
            try {
                return btoa(atob(str)) === str;
            } catch (err) {
                return false;
            }
        },

        // Decode a Base64 string and extract tokens
        decodeBase64AndExtractTokens(base64Str) {
            if (base64Str == null || !this.isBase64(base64Str)) {
                return null;
            }
            const decodedStr = atob(base64Str);
            const tokens = decodedStr.split(/[:\s,]+/); // adjust separators if needed
            return tokens;
        },

        easter(){
            if (this.biptest){
                this.biptest = false
                document.getElementById('cpleft').classList.toggle('active');
                document.getElementById('cpleft').classList.toggle('inactive');
            } 
            else { 
                this.biptest = true
                document.getElementById('cpleft').classList.toggle('active');
                document.getElementById('cpleft').classList.toggle('inactive');
            }
            console.log("biptest:", this.biptest)
        },

        async fetchInfo() {
            this.hostip = await ipcRenderer.invoke('checkhostip')
            if (this.hostip?.availableInterfaces?.length > 1 && !this.hostip.preferredInterface){
                this.selectPreferredInterface()
            }
        },

        async selectPreferredInterface(){
          
                if (this.activeDialog) return;
                //first block dialog to prevent multiple dialogs 
                this.activeDialog = true

                //ask user to select a preferred interface
                this.$swal.fire({
                    customClass: {
                        popup: 'my-popup',
                        title: 'my-title',
                        content: 'my-content',
                        input: 'my-custom-input',
                        inputLabel: 'my-input-label',
                        actions: 'my-swal2-actions'
                    },
                    title: this.$t("startserver.selectinterface"),
                    html: "<div class='my-content'>" + this.$t("startserver.selectinterfaceinfo") + "<br><br>" + 
                          this.hostip.availableInterfaces.map(netInterface => 
                            `<div style="margin: 5px 0; padding: 5px; background-color: #f8f9fa; border-radius: 3px;">
                                <strong>${netInterface.name}</strong>: ${netInterface.address}
                            </div>`
                          ).join('') + "</div>",
                    showCancelButton: true,
                    cancelButtonText: this.$t("dashboard.cancel"),
                    input: "select",
                    inputOptions: this.hostip.availableInterfaces.reduce((acc, curr) => {
                        acc[curr.name] = curr.name;
                        return acc;
                    }, {}),
                    inputPlaceholder: "",
                }).then((result) => {
                    if (result.isConfirmed) {
                        ipcRenderer.invoke('setPreferredInterface', result.value);
                        this.activeDialog = false;
                    }
                });
            
        },



        // by unsetting the preferred interface, the system will automatically show the dialog again to select a new preferred interface
        reconfigurePreferredInterface(){
            this.activeDialog = false;
            this.selectPreferredInterface()
            
        },




        async checkDiscspace(){   // note: custom workdir conflicts with running teacher as pure web instance - wontfix
           this.freeDiscspace = await ipcRenderer.invoke('checkDiscspace')
        },

        async getPreviousExams(){
            // get previously created exams from workdir
            let previousExams = await ipcRenderer.invoke('scanWorkdir')

            // filter out exams that are not compatible with the current version
           // previousExams = previousExams.filter(exam => exam.nextexamVersion === this.version)

            this.previousExams = previousExams
           // console.log("previousExams:", this.previousExams)


            this.config = await ipcRenderer.invoke('getconfigasync')
            this.workdir = this.config.workdirectory   // reflect any backend changes to workdir
            this.backupdir = this.config.backupdirectory || ''
        },


        /** Sets the exam name field to the clicked exam directory name. */
        async setPreviousExam(exam){
            if (!this.isExamVersionCompatible(exam)) {
                this.status(this.$t('startserver.incompatible'));
                return;
            }
            this.servername = exam.examName
            this.selectedExam = exam

            this.checkExistingExam()  // updates start button label
        },


        /** Creates an independent copy of a local exam configuration. */
        async duplicateExam(exam){
            let suffix = '-copy'
            let duplicateName = `${exam.examName.slice(0, 20 - suffix.length)}${suffix}`
            let counter = 2
            while (this.previousExams.some(item => (item.examName || '').toLowerCase() === duplicateName.toLowerCase())) {
                suffix = `-copy-${counter++}`
                duplicateName = `${exam.examName.slice(0, 20 - suffix.length)}${suffix}`
            }

            const result = await this.$swal.fire({
                title: this.$t('startserver.duplicateTitle'),
                input: 'text',
                inputLabel: this.$t('startserver.examname'),
                inputValue: duplicateName,
                inputAttributes: { maxlength: 20 },
                showCancelButton: true,
                confirmButtonText: this.$t('startserver.duplicate'),
                cancelButtonText: this.$t('dashboard.cancel'),
                inputValidator: value => {
                    const name = (value || '').trim().toLowerCase()
                    if (!/^[a-z0-9_-]{1,20}$/.test(name)) return this.$t('startserver.examnameCharsetHint')
                    if (this.previousExams.some(item => (item.examName || '').toLowerCase() === name)) return this.$t('startserver.duplicateExists')
                },
            })
            if (!result.isConfirmed) return

            const targetName = result.value.trim().toLowerCase()
            const response = await ipcRenderer.invoke('duplicateExam', { sourceName: exam.examName, targetName })
            if (response.status !== 'success') {
                this.status(this.$t('startserver.duplicateFailed'))
                return
            }
            await this.getPreviousExams()
            const duplicate = this.previousExams.find(item => (item.examName || '').toLowerCase() === targetName)
            if (duplicate) await this.setPreviousExam(duplicate)
        },


        /** Looks up the typed exam name among the previous exams and updates the wizard state (resume / conflict / password). */
        async checkExistingExam(){
            const servernameLower = (this.servername || '').toLowerCase()
            const previousExam = (this.previousExams || []).find(e => (e.examName || '').toLowerCase() === servernameLower)
            this.existingExam = previousExam || null

            if (!previousExam) {
                this.bipNameConflict = false
                this.backupdir = ''
                return
            }

            // BiP exam with same name: block if we are in the local tab
            if (previousExam.bip && this.activeTab !== 'bildungsportal') {
                this.backupdir = ''
                this.bipNameConflict = true
                return
            }

            this.bipNameConflict = false
            this.backupdir = previousExam.backupdirectory || ''
            if (!this.isExamVersionCompatible(previousExam)) return

            this.password = ""
            this.passwordConfirm = ""
            if (typeof previousExam.examPassword === 'string' && previousExam.examPassword.trim() !== '') {
                this.password = previousExam.examPassword
                this.passwordConfirm = previousExam.examPassword
            }
        },

        /** Deletes the selected exam. */
        delPreviousExam(name){
            // Ask for confirmation!
            this.$swal.fire({
                customClass: {
                    popup: 'my-popup',
                    title: 'my-title',
                    content: 'my-content',
                    input: 'my-custom-input',
                    inputLabel: 'my-input-label',
                    actions: 'my-swal2-actions'
                },
                title: this.$t("startserver.previousexams"),
                html: `<div class="my-content">${this.$t("startserver.folderdelete")} <br> <br> <span style="font-weight:bold; text-align:left;">${name}</span></div>`,
                icon: "warning",
                showCancelButton: true,
                cancelButtonText: this.$t("dashboard.cancel"),
              
            })
            .then(async (result) => {
                if (result.isConfirmed) { 
                    let response = await ipcRenderer.invoke('delPrevious', name)
                    console.log(response)
                    await this.getPreviousExams()
                    // reset selection if the deleted exam was the selected one
                    if ((this.servername || '').toLowerCase() === (name || '').toLowerCase()) {
                        this.servername = ''
                        this.selectedExam = null
                    }
                    this.checkExistingExam()
                } 
            });  
        },


        async setBackupdir(){
            let response = await ipcRenderer.invoke('setbackupdir')
            this.backupdir = response.backupdir
            this.config.backupdirectory = response.backupdir

            if (response.message == "error"){
                this.status(this.$t("startserver.directoryerror"))
            }
        },

        // Picks NXE1-encrypted student PDF, decrypts it with the entered exam password and saves the plain PDF.
        async decryptEncryptedPdf() {
            const prompt = await this.$swal.fire({
                title: this.$t('dashboard.openEncryptedPdf'),
                text: this.$t('dashboard.openEncryptedPdfPrompt'),
                input: 'text',
                inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
                showCancelButton: true,
                cancelButtonText: this.$t('dashboard.cancel'),
                confirmButtonText: this.$t('general.ok'),
                customClass: { popup: 'custom-swal2-popup-info' },
            })
            if (!prompt.isConfirmed) return
            const res = await ipcRenderer.invoke('decryptEncryptedPdfToFile', String(prompt.value ?? '').trim())
            if (res?.cancelled || res?.ok) return
            const map = {
                NEEDS_PASSWORD: 'dashboard.openEncryptedPdfNeedEncryptionKey',
                BAD_PASSWORD: 'dashboard.openEncryptedPdfBadPassword',
                STILL_ENCRYPTED: 'dashboard.openEncryptedPdfBadPassword',
                NOT_PDF: 'dashboard.openEncryptedPdfNotPdf',
            }
            await this.$swal.fire({
                icon: 'error',
                title: this.$t(map[res?.code] || 'dashboard.openEncryptedPdfError'),
                text: res?.message || '',
            })
        },

        togglePasswordVisibility(){
            this.showPassword = !this.showPassword
        },

        async startServer(){
            if (this.servername === "" ){
                this.status(this.$t("startserver.emptyname"));
            }
            else if (this.passwordMismatch){
                this.status(this.$t("startserver.pwdmismatch"));
            }
            else {
                // Block if a BiP exam with this name exists locally but we're in the local tab
                const servernameLower = (this.servername || '').toLowerCase()
                const conflictingBipExam = this.previousExams.find(e => (e.examName || '').toLowerCase() === servernameLower && e.bip)
                if (conflictingBipExam && this.activeTab !== 'bildungsportal') {
                    this.status(this.$t("startserver.bipNameConflictInfo"))
                    return
                }

                let isBip = this.selectedExam && this.selectedExam.bip && (this.selectedExam.examName || '').toLowerCase() === servernameLower ? true : false
                let bipId = this.selectedExam && this.selectedExam.id ? this.selectedExam.id : null

                // Enforce tab separation: local exams only in local tab, bip exams only in bip tab
                if (isBip && this.activeTab !== 'bildungsportal') { this.status("BiP exams can only be started in the Bildungsportal tab."); return; }
                if (!isBip && this.activeTab === 'bildungsportal') { this.status("Local exams can only be started in the Local Exam tab."); return; }

                if (isBip && !this.bipToken){
                    this.status(this.$t("startserver.bipnotloggedin")); 
                    return;
                }
                
                // check if the servername equals a previous exam
                if (this.previousExams.some(exam => (exam.examName || '').toLowerCase() === servernameLower)){
                    this.selectedExam = this.previousExams.find(exam => (exam.examName || '').toLowerCase() === servernameLower)
                }
                else {
                    this.selectedExam = null
                }
           

                // check if the exam is compatible with the current version
                if (this.selectedExam && !this.isExamVersionCompatible(this.selectedExam)) {
                    this.status(this.$t("startserver.incompatible"));
                    return;
                }

                try {
                    const response = await ipcRenderer.invoke('startExamServer', {
                        servername: this.servername.toLowerCase(),
                        passwd: this.effectiveExamPassword,
                        bip: isBip,
                        bipId: bipId,
                    })
                    if (response.status === "success") {  //directly log in
                        this.status(response.message);
                        await this.sleep(1000);
                      
                        this.$router.push({  // for some reason this doesn't work on mobile
                            name: 'dashboard', 
                            params:{
                                servername: this.servername.toLowerCase(), 
                                passwd: this.effectiveExamPassword,
                                bipToken: this.bipToken,
                                bipUsername: this.bipUsername,
                                bipuserID:this.bipuserID,
                                biptest: this.biptest
                            }
                        })
                        
                    }
                    else { 
                        this.status(response.message); 
                    }
                } catch (err) { this.status(err); console.warn(err) }
            } 
        },
        showCopyleft(){
            this.$swal.fire({     
                customClass: {
                    'icon': 'custom-swal2-icon'
              
                },
                title: "<span id='cpleft' class='active' style='display:inline-block; transform: scaleX(-1); vertical-align: middle;cursor: pointer;'>&copy;</span> <span style='font-size:0.8em'>Thomas Michael Weissel </span>",
                icon: 'info',
                html: `
                <a href="https://www.bmbwf.gv.at/Themen/schule/zrp/dibi/foss.html" target="_blank"><img style="width: 230px; opacity:1;" src="./BMB_Logo_srgb.png"></a>
                <br>
                <br>
                <a href="https://linux-bildung.at" target="_blank"><img style="width: 50px; opacity:0.7;" src="./osos.svg"></a>   <br>
                <span style="font-size:0.8em"> <a href="https://next-exam.at" target="_blank">next-exam.at</a> </span> <br>
                <span style="font-size:0.8em">Version: ${this.version} ${this.info}</span> <br>
                <span style="font-size:0.8em">Build: ${this.buildDate}</span>
                `,
                didRender: () => {
                    document.getElementById('cpleft').onclick = () => this.easter();
                }
            })
        },
        // show a short toast message
        async status(text){
            this.toast = String(text ?? '');
            clearTimeout(this.toastTimer);
            this.toastTimer = setTimeout(() => { this.toast = '' }, 3000);
        },

        // implementing a sleep (wait) function
        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },
        // Shows a short hint next to the exam name field when a disallowed character is rejected or paste/drop is blocked.
        flashServernameCharsetHint() {
            this.showServernameCharsetHint = true;
            clearTimeout(this.toastTimer);
        if (this.servernameCharsetHintTimer) {
                clearTimeout(this.servernameCharsetHintTimer);
            }
            this.servernameCharsetHintTimer = setTimeout(() => {
                this.showServernameCharsetHint = false;
                this.servernameCharsetHintTimer = null;
            }, 1600);
        },
        onServernamePasteOrDrop(e) {
            e.preventDefault();
            this.flashServernameCharsetHint();
        },
        validateInput(e) {
            const lettersOnly = /^[a-zA-Z0-9-_]+$/;
            const key = e.key || String.fromCharCode(e.which);
            if (!lettersOnly.test(key)) {
                e.preventDefault();
                // Avoid hint for navigation/control keys (single printable chars and space are the usual mistakes).
                if (key.length === 1 || e.code === 'Space' || key === ' ') {
                    this.flashServernameCharsetHint();
                }
            }
        },

    },
    async mounted() {  // when ready
        log.info('startserver @ mounted: next-exam ready!');
        this.hostname = "localhost"
        this.checkDiscspace()
        await this.getPreviousExams()
        this.checkExistingExam()

        this.bipTokenHandler = (event, token) => {
            console.log("token received: ",token)
            this.bipToken = token
            this.fetchBiPData(token)
        };
        ipcRenderer.on('bipToken', this.bipTokenHandler);



        // do not use setInterval() for intervals as it keeps all objects of the callbacks including fetch() responses in memory until the interval is stopped
        this.fetchinterval = new SchedulerService(4000);
        this.fetchinterval.addEventListener('action',  this.fetchInfo);  // event listener that reacts to the 'action' event (only reacts to 'action' from this instance and does not interfere)
        this.fetchinterval.start(); 


        if (this.bipToken !== false){ 
            this.fetchBipExams();
            //console.log(this.bipToken) 
        }


        // set the locale to the system locale
        const systemLocale = navigator.language.split('-')[0] // z.B. "de" aus "de-DE"
        const locale = ['de', 'en'].includes(systemLocale) ? systemLocale : 'en' // Fallback zu 'en'
        this.$i18n.locale = locale
        //console.log("locale:", systemLocale, locale)

        this.$nextTick(() => document.getElementById('servername')?.focus());
    },
    beforeUnmount() {
        ipcRenderer.removeListener('bipToken', this.bipTokenHandler);
        this.fetchinterval?.removeEventListener('action', this.fetchInfo);
        this.fetchinterval?.stop();
        if (this.servernameCharsetHintTimer) {
            clearTimeout(this.servernameCharsetHintTimer);
            this.servernameCharsetHintTimer = null;
        }
    },
}
</script>
<style>
/* easter egg toggles on the copyleft swal */
.active { filter: contrast(100%) grayscale(100%) brightness(80%) !important; }
.inactive { filter: contrast(40%) grayscale(100%) brightness(130%) blur(0.6px) !important; }
</style>

<style scoped>
.nx-start { height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
.nx-main { flex: 1 1 auto; overflow-y: auto; padding: 40px 24px 24px; }
.nx-container { max-width: 880px; margin: 0 auto; }
.nx-center { display: flex; justify-content: center; }
.nx-wizard { max-width: 760px; margin: 0 auto; overflow: hidden; }
.nx-actions { display: flex; gap: 12px; align-items: center; justify-content: flex-end; flex-wrap: wrap; }
.nx-pill-btn { cursor: pointer; font-family: inherit; }
.nx-pill-btn:hover { filter: brightness(.96); }

.nx-summary { margin: 0; border: 1px solid var(--nx-border); border-radius: 14px; background: var(--nx-surface-2); overflow: hidden; }
.nx-summary > div { display: flex; gap: 16px; align-items: center; padding: 14px 18px; border-bottom: 1px solid var(--nx-border); }
.nx-summary > div:last-child { border-bottom: 0; }
.nx-summary dt { width: 120px; flex-shrink: 0; color: var(--nx-muted); font-weight: 600; font-size: .88rem; }
.nx-summary dd { margin: 0; min-width: 0; flex: 1 1 auto; }

.nx-options { margin-top: 12px; padding: 18px; border: 1px dashed #cfd5ea; border-radius: 14px; background: #fcfcff; }
.nx-pw-row { display: flex; gap: 10px; align-items: center; }
.nx-pw-row .nx-input { flex: 1 1 0; min-width: 0; }
.nx-path { flex: 1 1 auto; min-width: 0; padding: 11px 14px; background: var(--nx-surface-2); border: 1px solid var(--nx-border); border-radius: 11px; font-size: .9rem; }

.nx-recent-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
.nx-exam { padding: 16px 18px; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.nx-exam-head { display: flex; align-items: center; gap: 8px; justify-content: space-between; min-width: 0; }
.nx-exam-head b { font-size: 1.02rem; }
.nx-exam-meta { font-size: .84rem; display: flex; gap: 6px; }
.nx-exam-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.nx-exam-actions { display: flex; gap: 2px; opacity: 0; transition: opacity .15s; }
.nx-exam:hover .nx-exam-actions, .nx-exam:focus-within .nx-exam-actions { opacity: 1; }
.nx-danger-hover:hover { color: var(--nx-danger); }
.is-incompatible { opacity: .5; cursor: not-allowed; }
.nx-news { padding: 12px 0; border-bottom: 1px solid var(--nx-border); }
.nx-news:last-child { border-bottom: 0; }

.nx-foot { flex-shrink: 0; padding: 10px 24px; text-align: center; font-size: .8rem; color: var(--nx-muted); }
.nx-foot-link { cursor: pointer; }
</style>
