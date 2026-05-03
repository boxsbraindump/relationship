// 修改 state 初始结构[cite: 7]
let state = {
    patterns: { ALCHEMIST: 0, PLEASING: 0, AVOIDANT: 0, CONFRONT: 0, RATIONAL: 0 },
    // 新增：维度得分详情
    dimensionScores: {
        "工作维度": 0,
        "亲密关系": 0,
        "朋友维度": 0,
        "家人维度": 0,
        "路人/弱关系": 0
    },
    currentChapIdx: 0,
    currentSceneIdx: 0,
    gameScore: 100,
    history: [] 
};



// 显示屏幕并处理历史记录
function showScreen(id, pushHistory = true) {
    if (pushHistory) {
        state.history.push({
            screenId: id,
            patterns: JSON.parse(JSON.stringify(state.patterns)),
            gameScore: state.gameScore,
            currentChapIdx: state.currentChapIdx,
            currentSceneIdx: state.currentSceneIdx
        });
    }

    const screens = ['welcome-screen', 'calibration-screen', 'chapter-transition', 'game-screen', 'end-screen'];
    screens.forEach(s => {
        const el = document.getElementById(s);
        if(el) el.classList.add('hidden');
    });
    
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
    window.scrollTo(0,0);
}

// 返回上一页逻辑
function goBack() {
    if (state.history.length <= 1) {
        location.reload();
        return;
    }

    state.history.pop(); // 移除当前
    const lastState = state.history[state.history.length - 1];

    // 恢复数据
    state.patterns = JSON.parse(JSON.stringify(lastState.patterns));
    state.gameScore = lastState.gameScore;
    state.currentChapIdx = lastState.currentChapIdx;
    state.currentSceneIdx = lastState.currentSceneIdx;

    showScreen(lastState.screenId, false);

    // 重新触发对应页面的渲染
    if (lastState.screenId === 'game-screen') {
        renderScene();
    } else if (lastState.screenId === 'chapter-transition') {
        showChapterTransition(state.currentChapIdx, false);
    } else if (lastState.screenId === 'calibration-screen') {
        startCalibration(false);
    }
}

// 预备测试
function startCalibration(push = true) {
    showScreen('calibration-screen', push);
    const q = calibrationQuestions[0];
    document.getElementById('calib-question').innerText = q.q;
    const container = document.getElementById('calib-options');
    container.innerHTML = '';
    q.options.forEach(opt => {
        const btn = document.createElement('div');
        btn.className = 'option-card p-6 rounded-3xl text-sm text-stone-500';
        btn.innerText = opt.text;
        btn.onclick = () => {
            state.patterns[opt.type]++;
            showChapterTransition(0);
        };
        container.appendChild(btn);
    });
}

// 章节过渡
function showChapterTransition(idx, push = true) {
    state.currentChapIdx = idx;
    const ch = chapters[idx];
    showScreen('chapter-transition', push);
    document.getElementById('trans-badge').innerText = ch.badge;
    document.getElementById('trans-title').innerText = ch.title;
    document.getElementById('trans-story').innerText = ch.story;
    
    const outlineContainer = document.getElementById('trans-outline');
    outlineContainer.innerHTML = `<p class="text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b pb-2 mb-4">本章核心修行</p>`;
    ch.outline.forEach(item => {
        const p = document.createElement('p');
        p.className = 'text-xs text-stone-600 pl-4 relative before:content-["•"] before:absolute before:left-0 before:text-nude-highlight';
        p.innerText = item;
        outlineContainer.appendChild(p);
    });

    document.getElementById('trans-btn').onclick = () => startChapter(idx);
}

function startChapter(idx) {
    state.currentSceneIdx = 0;
    showScreen('game-screen');
    renderScene();
}

// 渲染场景
function renderScene() {
    const ch = chapters[state.currentChapIdx];
    const sc = ch.scenes[state.currentSceneIdx];
    
    document.getElementById('dimension-indicator').innerText = ch.dimension;
    document.getElementById('chapter-label').innerText = ch.title;
    
    const totalScenes = chapters.reduce((acc, c) => acc + c.scenes.length, 0);
    const currentCount = chapters.slice(0, state.currentChapIdx).reduce((acc, c) => acc + c.scenes.length, 0) + state.currentSceneIdx + 1;
    document.getElementById('game-progress').innerText = `${currentCount} / ${totalScenes}`;
    
    document.getElementById('scene-title').innerText = sc.title;
    document.getElementById('scenario-text').innerText = sc.scene;
    document.getElementById('book-quote').innerText = ch.quote;

    const container = document.getElementById('options-container');
    container.innerHTML = '';
    sc.options.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'option-card p-6 rounded-2xl text-sm leading-relaxed text-stone-600';
        div.innerText = opt.text;
        div.onclick = () => handleChoice(opt, div);
        container.appendChild(div);
    });
    document.getElementById('feedback-area').classList.add('hidden');
}

function handleBackToChoice() {
    // 1. 关闭弹窗
    const feedbackArea = document.getElementById('feedback-area');
    feedbackArea.classList.add('hidden');
    feedbackArea.classList.remove('flex');

    // 2. 撤销数据变动[cite: 3]
    const lastAction = state.history.pop(); // 移除最后一条历史记录
    if (lastAction) {
        state.gameScore -= lastAction.score; // 扣回分数
        state.patterns[lastAction.selectedType]--; // 减去性格计数
        
        // 扣除维度分
        const currentDim = chapters[state.currentChapIdx].dimension;
        if (state.dimensionScores.hasOwnProperty(currentDim)) {
            state.dimensionScores[currentDim] -= lastAction.score;
        }
    }

    // 3. 恢复选项 UI 状态[cite: 3]
    document.querySelectorAll('#options-container .option-card').forEach(item => {
        item.style.pointerEvents = 'auto'; // 恢复点击
        item.style.opacity = '1';          // 恢复透明度
        item.classList.remove('selected'); // 移除选中样式
    });
}

function handleChoice(opt, el) {
    // 基础积分与人格统计逻辑保持不变
    state.gameScore += opt.score;
    state.patterns[opt.type]++;
    
    const currentScene = chapters[state.currentChapIdx].scenes[state.currentSceneIdx];
    state.history.push({
        sceneTitle: currentScene.title,
        selectedType: opt.type,
        score: opt.score,
        screenId: 'game-screen'
    });

    const currentDim = chapters[state.currentChapIdx].dimension;
    if (state.dimensionScores.hasOwnProperty(currentDim)) {
        state.dimensionScores[currentDim] += opt.score;
    }

    // --- 修改 UI 反馈为弹窗模式 ---
    const feedbackArea = document.getElementById('feedback-area');
    
    // 设置内容
    document.getElementById('feedback-label').innerText = opt.score >= 40 ? '炼金成功' : '掉入陷阱';
    document.getElementById('feedback-content').innerText = opt.feedback;
    document.getElementById('persona-analysis').innerText = opt.persona;

    // 显示弹窗 (使用 flex 覆盖 hidden)
    feedbackArea.classList.remove('hidden');
    feedbackArea.classList.add('flex');

    // 选项置灰逻辑保持不变[cite: 3]
    document.querySelectorAll('#options-container .option-card').forEach(item => {
        item.style.pointerEvents = 'none';
        item.style.opacity = '0.3';
    });
    el.style.opacity = '1';
    el.classList.add('selected');
}

// 在 app.js 中替换或新增此辅助函数
function getAnalyzedDimensions() {
    // 找出所有真正产生过互动的维度（分数不为0的）
    const activeDims = Object.entries(state.dimensionScores)
        .filter(([name, score]) => score !== 0) 
        .map(([name, score]) => {
            // 计算平均分：由于每个章节场景数不同，平均分比总分更客观
            const chapter = chapters.find(c => c.dimension === name);
            const sceneCount = chapter ? chapter.scenes.length : 1;
            return { name, avg: score / sceneCount };
        });

    // 如果还没开始测试或分数全为0，返回占位符[cite: 7]
    if (activeDims.length === 0) return { best: "初学者", worst: "待修行" };

    // 按平均分排序[cite: 7]
    activeDims.sort((a, b) => b.avg - a.avg);
    
    return {
        best: activeDims[0].name,
        worst: activeDims[activeDims.length - 1].name
    };
}

function handleNextClick() {
    // 关闭反馈弹窗
    const feedbackArea = document.getElementById('feedback-area');
    feedbackArea.classList.add('hidden');
    feedbackArea.classList.remove('flex');

    const ch = chapters[state.currentChapIdx];
    if (state.currentSceneIdx + 1 < ch.scenes.length) {
        state.currentSceneIdx++;
        renderScene();
    } else if (state.currentChapIdx + 1 < chapters.length) {
        showChapterTransition(state.currentChapIdx + 1);
    } else {
        showFinalReport();
    }
}

function showFinalReport() {
    showScreen('end-screen');
    const container = document.getElementById('result-summary');
    
    // 1. 获取主导人格
    const dominant = Object.keys(state.patterns).reduce((a, b) => 
        state.patterns[a] > state.patterns[b] ? a : b
    );
    const pattern = reportRemedies[dominant];
    const { best, worst } = getAnalyzedDimensions();

    // 1. 先定义处方的 HTML 结构（逻辑是冷的，赞美是热的）
// app_3.js
const rxHtml = `
        <div class="prescription-card p-8 text-left fade-in">
            <div class="rx-symbol">Rx</div>
            <div class="prescription-badge">社交修行处方 · ${pattern.tag}</div>
            
            <div class="rx-formula mb-6">
                <div class="formula-item warm ${pattern.logicColor}">赞美是热的</div>
                <div class="text-stone-300">|</div>
                <div class="formula-item cold text-stone-400">逻辑是冷的</div>
            </div>

            <div class="space-y-6 relative z-10">
                <section>
                    <p class="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">◎ 修行心法</p>
                    <p class="text-[15px] text-stone-700 leading-relaxed font-serif italic">
                        “${pattern.mindset}”
                    </p>
                </section>

                <div class="h-px bg-gradient-to-r from-nude-accent/50 to-transparent w-full"></div>

                <section>
                    <p class="text-[10px] font-bold text-nude-highlight uppercase tracking-widest mb-2">◎ 药方指示</p>
                    <div class="text-sm text-stone-600 leading-loose">
                        ${pattern.remedy}
                    </div>
                </section>

                <section class="bg-stone-50/80 p-4 rounded-2xl border border-dashed border-nude-accent/50">
                    <p class="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">◎ 即刻炼金（每日练习）</p>
                    <p class="text-xs text-stone-500 leading-relaxed">
                        ${pattern.action}
                    </p>
                </section>
            </div>
        </div>
    `;

    // 2. 追溯具体的“名场面”
    const bestMoment = state.history.find(h => {
        const ch = chapters.find(c => c.dimension === best);
        return ch && ch.scenes.some(s => s.title === h.sceneTitle) && h.score >= 40;
    });

    const worstMoment = state.history.find(h => {
        const ch = chapters.find(c => c.dimension === worst);
        return ch && ch.scenes.some(s => s.title === h.sceneTitle) && h.score <= 10;
    });

    const highLightDesc = bestMoment 
        ? `你在“${bestMoment.sceneTitle}”中展现了卓越的觉知。` 
        : `你在该维度的整体表现非常稳健。`;

    const needAlchemyDesc = worstMoment 
        ? `面对“${worstMoment.sceneTitle}”时，你容易掉入惯性陷阱。` 
        : `该维度的复杂博弈仍需更多修行。`;
    
    // 3. 生成深度客制化洞察
    let customInsight = "";
    const workScore = state.dimensionScores["工作维度"] || 0;
    const familyScore = state.dimensionScores["家人维度"] || 0;

    if (workScore > 40 && familyScore < 20) {
        customInsight = `你在职场表现得体，但对家人却极度缺乏耐心。这种“外柔内刚”的错位，是你修行中最需要警惕的功课。`;
    } else if (state.patterns.CONFRONT >= 2) {
        customInsight = "你的潜意识中带着锋芒。还记得你处理冲突时的本能反击吗？那种冲动虽赢了气势，却留下了难以愈合的裂痕。";
    } else {
        customInsight = `你在【${best}】中表现出了极高的觉知，但在面对【${worst}】的考验时，你更容易退回到旧有的防御模式。`;
    }

    const bookExamples = {
        ALCHEMIST: "【施瓦布与雪茄】：当钢铁大王施瓦布路过工厂发现工人违规抽烟时，他没有行使权力去责备，而是微笑着递给每人一支昂贵的雪茄，轻声说：‘伙计们，如果你们能到外面抽这些雪茄，我会很感激。’他用一份礼物代替了一次羞辱，保护了工人的尊严。这种‘不着痕迹’的纠正，远比严厉的惩罚更能换来长久的忠诚与敬畏。",
        
        PLEASING: "【平庸的推销员】：卡耐基曾遇到一位推销员，对方为了成单而一味地迎合、点头，甚至在被无理质疑时也不敢反驳。卡耐基指出：如果你只为了避免冲突而放弃立场，你便失去了作为‘专业人士’的价值。没有人会真正尊重一个没有脊梁的影子；唯有当你带着觉知去沟通，而不是盲目讨好时，你的赞美才会拥有重量。",
        
        AVOIDANT: "【哈德利堡的沉默者】：在哈德利堡的社交圈中，有些人因为害怕说错话或被拒绝，选择了永远保持沉默和旁观。这种‘防御性’的孤独让他们躲过了尴尬，却也错过了所有生命中的高光时刻。卡耐基提醒我们：真诚关注他人是一场需要勇气的冒险，那些躲在盔甲里不去赞美、不去参与的人，最终会被生活遗忘在荒岛之上。",
        
        CONFRONT: "【青年富兰克林】：年轻时的富兰克林才华横溢却辞锋犀利，总能通过辩论把对手驳得哑口无言。直到一位老友当面告诫他：‘你的尖锐是一种灾难，你赢了辩论，却失去了所有朋友。’富兰克林如梦初醒，从此改掉了好斗的习惯，甚至禁止自己使用‘显然、无疑’等绝对化的词。这种克制，最终成就了他作为美国历史上最伟大外交家的伟业。",
        
        RATIONAL: "【丢掉合同的工程师】：一位顶尖工程师用一整小时、数千字逻辑严密的报告证明了客户对冷藏设备的理解是彻底错误的。他赢得了真理，甚至让对方无话可说，但最终那份价值数百万美元的合同却签给了他的对手。这个代价沉重的教训告诉我们：在人性的博弈中，逻辑往往是冰冷的。它能说服大脑，却无法敲开紧闭的心门；赢了道理而输了感情，是社交中最昂贵的失败。"
    };

    // 4. 【关键修正】计算维度 Bar 所需的数据列表
// 4. 【修正逻辑】计算维度数据，防止负数并放大文字
    const dimensionList = Object.entries(state.dimensionScores).map(([name, score]) => {
        const chapter = chapters.find(c => c.dimension === name);
        const sceneCount = chapter ? chapter.scenes.length : 1;
        
        // 假设满分为每题 50 分，计算原始百分比
        const maxPossible = sceneCount * 50; 
        let rawPercent = Math.round((score / maxPossible) * 100);

        // 核心修正：如果得分为负，显示为 0%（修行尚未入门），防止进度条崩坏
        const safePercent = Math.max(0, Math.min(rawPercent, 100));

        return { name, percent: safePercent, displayScore: rawPercent };
    });

    const dimensionBarsHtml = dimensionList.map(dim => `
        <div class="mb-6">
            <div class="flex justify-between items-center mb-2">
                <!-- 增大维度名称字号 -->
                <span class="text-sm font-bold text-stone-700 tracking-tight">${dim.name}</span>
                <!-- 增大百分比字号，并根据是否为负值提供视觉反馈 -->
                <span class="text-xs font-mono-report ${dim.displayScore < 0 ? 'text-rose-400' : 'text-nude-primary'}">
                    ${dim.displayScore}%
                </span>
            </div>
            <div class="dimension-progress-bg">
                <!-- 宽度使用安全百分比 (0-100) -->
                <div class="dimension-progress-fill" style="width: ${dim.percent}%"></div>
            </div>
        </div>
    `).join('');



    // 5. 最终 HTML 渲染
    container.innerHTML = `
        <div class="nude-card p-8 mb-6 text-center relative overflow-hidden">
            <div class="persona-tag-bg">${pattern.tag}</div>
            <div class="mb-4 relative z-10">
                <span class="text-6xl font-bold text-nude-primary serif">${state.gameScore}</span>
                <p class="text-[10px] mt-2 uppercase tracking-widest text-stone-400">修行最终评分</p>
            </div>
            <h2 class="text-2xl serif font-bold text-nude-primary mb-2 relative z-10">${pattern.title}</h2>
            
            
            <div class="bg-stone-50 p-6 rounded-3xl border-l-4 border-nude-highlight text-left mb-6">
                <p class="text-[10px] font-bold text-nude-highlight uppercase mb-2 tracking-widest">深度修行洞察</p>
                <p class="text-sm text-stone-700 italic">“${customInsight}”</p>
            </div>

            <!-- 维度分析 -->
            <div class="text-left mb-6">
                <p class="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-6 border-b pb-2">关系维度觉知分布</p>
                <div class="space-y-4">
                    ${dimensionBarsHtml}
                </div>
            </div>

            <!-- 高光与挑战 -->
            <div class="grid grid-cols-2 gap-4 mb-6 text-left">
                <div class="p-4 bg-stone-50 rounded-2xl">
                    <p class="text-[12px] text-nude-primary font-bold uppercase mb-1">↑ 高光</p>
                    <p class="text-[15px] text-stone-600 leading-snug">${highLightDesc}</p>
                </div>
                <div class="p-4 bg-stone-50 rounded-2xl">
                    <p class="text-[12px] text-rose-400 font-bold uppercase mb-1">↓ 待炼金</p>
                    <p class="text-[15px] text-stone-600 leading-snug">${needAlchemyDesc}</p>
                </div>
            </div>

            <div class="bg-nude-bg p-6 rounded-3xl text-left border border-nude-accent/30">
                <p class="text-[15px] font-bold text-nude-primary uppercase mb-2 tracking-widest">经典案例</p>
                <p class="text-[13px] text-stone-500 leading-relaxed">${bookExamples[dominant]}</p>
            </div>
        </div>



        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="9 5l7 7-7 7"></path></svg>
    </button>
    ${rxHtml} <!-- 在这里插入生成的处方卡片[cite: 10] -->

    <button onclick="location.reload()" class="w-full py-4 bg-stone-100 rounded-3xl text-sm text-stone-500 font-bold">
        重新开始修行
    </button>
`;
}




// 动态计算表现最差的维度[cite: 6, 7]
function getWorstDimension() {
    return Object.keys(state.dimensionScores).reduce((a, b) => 
        state.dimensionScores[a] < state.dimensionScores[b] ? a : b
    );
}

