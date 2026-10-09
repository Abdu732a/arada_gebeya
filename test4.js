fetch('https://qefiira.com/').then(r=>r.text()).then(html=>{
    const regex = /href="([^"]+)"[^>]*>([^<]+)</gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
        if (match[2].toLowerCase().includes('phone') || match[2].toLowerCase().includes('mobile')) {
            console.log(match[1], match[2]);
        }
    }
});
