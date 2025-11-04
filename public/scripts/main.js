class Main {
    constructor() {
        this.pageViewsKey = 'pageViewsCount';
        this.initializeCounter();
        this.displayCount();
    }

    initializeCounter() {
        if (!localStorage.getItem(this.pageViewsKey)) {
            localStorage.setItem(this.pageViewsKey, '0');
        }
    }

    incrementCount() {
        let currentCount = parseInt(localStorage.getItem(this.pageViewsKey));
        currentCount++;
        localStorage.setItem(this.pageViewsKey, currentCount.toString());
    }

    displayCount() {
        this.incrementCount();
        // Update count in div id count
        document.getElementById('count').innerHTML = 'You have visited this page ' + localStorage.getItem(this.pageViewsKey)  + ' times.'
    }
}

// Note that we construct the class here, but we don't need to assign it to a variable.
document.mainClass = new Main();

// Cookie explosion feature
document.addEventListener('DOMContentLoaded', () => {
    // Restore saved theme
    try {
        const savedTheme = localStorage.getItem('preferredTheme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark');
        }
    } catch (e) {}

    // Theme toggle wiring
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark');
            try {
                localStorage.setItem('preferredTheme', document.body.classList.contains('dark') ? 'dark' : 'light');
            } catch (e) {}
        });
    }

    // Gradient shuffle wiring
    const shuffleBtn = document.getElementById('gradientShuffleBtn');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
            const hero = document.querySelector('.hero');
            if (!hero) return;
            const gradients = getGradientOptions();
            const next = gradients[Math.floor(Math.random() * gradients.length)];
            hero.style.background = next;
        });
    }

    // Floating shapes initialization
    initFloatingShapes();
});

function getGradientOptions() {
    // A set of pleasant, professional stacks matching the CSS hero pattern
    return [
        'radial-gradient(1000px 500px at 10% -10%, #e8f2ff 0%, rgba(232,242,255,0) 60%), radial-gradient(900px 450px at 110% 0%, #fff0f3 0%, rgba(255,240,243,0) 60%), linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
        'radial-gradient(1000px 500px at -10% 10%, #e9ffe8 0%, rgba(233,255,232,0) 60%), radial-gradient(900px 450px at 100% -10%, #f0f4ff 0%, rgba(240,244,255,0) 60%), linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
        'radial-gradient(1000px 500px at 20% -20%, #fff4e6 0%, rgba(255,244,230,0) 60%), radial-gradient(900px 450px at 120% -10%, #e6f0ff 0%, rgba(230,240,255,0) 60%), linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
        'radial-gradient(1000px 500px at 0% -10%, #f5e8ff 0%, rgba(245,232,255,0) 60%), radial-gradient(900px 450px at 100% 0%, #e6fff8 0%, rgba(230,255,248,0) 60%), linear-gradient(180deg, #ffffff 0%, #fafafa 100%)'
    ];
}

function initFloatingShapes() {
    const container = document.getElementById('shapes-layer');
    if (!container) return;
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const count = reduceMotion ? 4 : 12;
    const palettes = [
        ['#0a84ff', '#64d2ff'],
        ['#ff375f', '#ff9f0a'],
        ['#30d158', '#5ac8fa'],
        ['#af52de', '#5856d6'],
        ['#ffd60a', '#ff6b6b']
    ];
    for (let i = 0; i < count; i++) {
        const [c1, c2] = palettes[i % palettes.length];
        const el = document.createElement('div');
        el.className = 'shape-bubble';
        const size = 120 + Math.random() * 220; // px
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        const dx = (-60 + Math.random() * 120) * (Math.random() > 0.5 ? 1 : -1);
        const dy = (-80 + Math.random() * 160) * (Math.random() > 0.5 ? 1 : -1);
        const dur = 16 + Math.random() * 18; // seconds
        const delay = Math.random() * 8; // seconds
        const blur = Math.random() < 0.5 ? 0 : 2 + Math.random() * 3;
        const opacity = 0.25 + Math.random() * 0.25;
        const scale = 1 + Math.random() * 0.2;
        const spinDur = 40 + Math.random() * 60; // seconds

        el.style.setProperty('--size', size + 'px');
        el.style.setProperty('--x', x + 'px');
        el.style.setProperty('--y', y + 'px');
        el.style.setProperty('--dx', dx + 'px');
        el.style.setProperty('--dy', dy + 'px');
        el.style.setProperty('--dur', dur + 's');
        el.style.setProperty('--delay', delay + 's');
        el.style.setProperty('--blur', blur + 'px');
        el.style.setProperty('--opacity', opacity.toString());
        el.style.setProperty('--scale', scale.toString());
        el.style.setProperty('--spinDur', spinDur + 's');

        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.background = `radial-gradient(120% 120% at 30% 30%, ${c1}, ${c2})`;
        el.style.boxShadow = `0 20px 60px ${c1}33, 0 8px 24px ${c2}22`;

        container.appendChild(el);
    }

    // Adjust on resize to keep coverage
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (!container) return;
            container.innerHTML = '';
            initFloatingShapes();
        }, 300);
    });
}
