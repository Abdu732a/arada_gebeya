fetch('https://qefiira.com/').then(r=>r.text()).then(html=>{
    const regex = /href="([^"]+)"[^>]*>([^<]+)</gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
        if (match[1].includes('business-category')) {
            console.log(match[1], match[2]);
        }
    }
});
