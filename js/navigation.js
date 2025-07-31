document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('#main-nav a');
    const sections = document.querySelectorAll('main section');

    function setActiveSection(sectionId) {
        sections.forEach(section => {
            section.classList.remove('active');
        });
        const activeSection = document.querySelector(sectionId);
        if (activeSection) {
            activeSection.classList.add('active');
        }
    }

    function setActiveNavLink(clickedLink) {
        navLinks.forEach(link => {
            link.classList.remove('active');
        });
        clickedLink.classList.add('active');
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('href');
            setActiveSection(sectionId);
            setActiveNavLink(link);
            history.pushState(null, '', sectionId);
        });
    });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
        const sectionId = location.hash || '#introduction';
        setActiveSection(sectionId);
        setActiveNavLink(document.querySelector(`a[href="${sectionId}"]`));
    });

    // Initial state
    const initialSectionId = location.hash || '#introduction';
    setActiveSection(initialSectionId);
    setActiveNavLink(document.querySelector(`a[href="${initialSectionId}"]`));
});