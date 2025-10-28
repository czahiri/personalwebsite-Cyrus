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
