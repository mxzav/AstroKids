# 🚀 AstroKids: Outpost Command
**Junior Astronaut Mission Trainer — NASA Space Apps Challenge**  
**مدرب مهام رواد الفضاء الصغار — تحدي تطبيقات ناسا للفضاء**

---

## 🌍 English Overview

**AstroKids: Outpost Command** is a lightweight, zero-lag, browser-playable 2D interactive simulation designed for kids aged **7–12**. It translates real NASA spaceflight engineering trade-offs into engaging, kid-friendly gameplay—where **no choice is free** and every decision carries real resource consequences.

### 🎯 The Problem & Our Solution
Space education for young learners often stays too abstract (posters and passive facts) or assumes advanced technical knowledge. Kids rarely experience the actual decision-making logic astronauts and mission planners face daily.

**AstroKids** puts players in the boots of a Junior Mission Commander managing a **Lunar (Artemis Base)** or **Martian (Jezero Crater)** outpost over **10 Sols (days)**:
- **The "2 Out of 3" Power Rule:** Players control three vital outpost systems—**Radiation Shielding (🛡️)**, **CSA Hydroponic Farm (🌿)**, and **Science Lab & Earth Comms (🔬)**—but the base reactor can only power **two systems at once**. Turning a third system ON automatically powers down the oldest active one.
- **Mars Communication Delay:** When operating on Mars, transmitting science data to Earth requires maintaining power across realistic signal-delay windows.
- **Non-Punitive Learning:** Running out of resources triggers an *Emergency Pod Save* with a plain-language scientific explanation from the onboard AI computer, encouraging kids to rethink their strategy and retry.
- **Personalized Certificate:** Completing the 10-Sol mission awards a downloadable/printable **Certificate of Excellence** featuring the child's Commander Name and an analysis comparing their trade-offs to real NASA mission-control protocols.

### 🛰️ NASA & Space Agency Open Data Sources
Every dilemma, solar storm alert, and radiation calculation in the game is grounded in authentic open science datasets (with live API integration and a built-in verified dataset fallback):

| Dataset / Resource | Agency | How It Powers AstroKids |
| :--- | :--- | :--- |
| **DONKI** *(Space Weather Database)* | NASA | Fetches live solar flare (FLR) and coronal mass ejection (CME) alerts to trigger real-date radiation storm dilemmas. |
| **RadLab** *(Radiation Dosimetry Database)* | NASA OSDR | Grounds shield-vs-health trade-offs in authentic ISS absorbed radiation dose rates (`mSv/day`). |
| **OSDR** *(Open Science Data Repository)* | NASA | Powers astronaut health alerts (bone density, muscle mass, immune response) and collectible science cards. |
| **Mars Trek** | NASA | Models the Jezero Crater landing site environment and Mars-Earth signal delay mechanics. |
| **APOD & Mars Rover Photos** | NASA | Provides real astronomical and Martian surface imagery inside science cards and mission logs. |
| **Food Production in Space Toolkit** | CSA *(Canadian Space Agency)* | Drives the Hydroponic Space Farm mechanics linking power/light to oxygen and food production. |

> *Disclaimer: Educational simulation built with open data from NASA and CSA. NASA does not endorse any non-U.S. Government entity.*

---

## 🇪🇬 نظرة عامة باللغة العربية

**AstroKids: Outpost Command** هي لعبة محاكاة تفاعلية ثنائية الأبعاد (2D) خفيفة وسريعة تعمل مباشرة عبر المتصفح بدون أي تحميل، ومصممة خصيصاً للأطفال من سن **7 إلى 12 عاماً**. تهدف اللعبة إلى ترجمة المقايضات الهندسية الحقيقية لرحلات الفضاء في وكالة ناسا إلى أسلوب لعب ممتع ومناسب للأطفال—حيث **لا يوجد اختيار مجاني**، وكل قرار يحمل تكلفة حقيقية تؤثر على الموارد.

### 🎯 المشكلة والحل الذي نقدمه
غالباً ما يظل المحتوى التعليمي الفضائي الموجه للأطفال مجرداً للغاية (مثل الملصقات والمعلومات النظرية العامة) أو يفترض خلفية تقنية متقدمة تفوق أعمارهم، مما يجعل الأطفال نادراً ما يختبرون منطق اتخاذ القرار الفعلي الذي يواجهه رواد الفضاء ومخططو المهام يومياً.

تضع لعبة **AstroKids** اللاعب في دور "قائد مهمة صغير" يدير قاعدة فضائية على **القمر (قاعدة أرتميس - Artemis Base)** أو على **المريخ (فوهة جيزيرو - Jezero Crater)** على مدار **10 أيام فضائية (10 Sols)**:
- **قاعدة الطاقة "2 من 3":** يتحكم اللاعب في ثلاثة أنظمة حيوية داخل المحطة—**درع الحماية من الإشعاع (🛡️)**، **الصوبة الزراعية المائية (🌿)**، و**معمل الأبحاث والاتصال بالأرض (🔬)**—ولكن مفاعل القاعدة لا يستطيع تشغيل سوى **نظامين فقط في نفس الوقت**. تشغيل النظام الثالث يؤدي تلقائياً إلى إيقاف النظام الأقدم تشغيلاً.
- **تأخير الاتصالات على المريخ:** عند اللعب على المريخ، يتطلب إرسال البيانات العلمية إلى الأرض الحفاظ على الطاقة طوال فترة تأخير الإشارة الواقعية بين الكوكبين.
- **التعلم غير المحبط:** نفاد أي مورد لا ينهي اللعبة بشكل محبط، بل يُفعّل "كبسولة الإنقاذ الطارئة" مع شرح علمي مبسط من كمبيوتر المحطة يشجع الطفل على إعادة التفكير في استراتيجيته والمحاولة مجدداً.
- **شهادة تقدير مخصصة:** إتمام المهمة بنجاح يمنح الطفل **شهادة تميز** قابلة للطباعة والتحميل تحمل اسمه، مع تحليل يقارن قراراته ببروتوكولات مركز التحكم الحقيقي في ناسا.

### 🛰️ مصادر البيانات المفتوحة من ناسا ووكالات الفضاء

| المصدر / قاعدة البيانات | الجهة | دورها في تشغيل لعبة AstroKids |
| :--- | :--- | :--- |
| **DONKI** *(قاعدة بيانات طقس الفضاء)* | وكالة ناسا (NASA) | سحب بيانات التوهجات الشمسية (FLR) والانبعاثات الإكليلية (CME) لايف لتوليد عواصف إشعاعية بتواريخ حقيقية. |
| **RadLab** *(قاعدة بيانات قياس الإشعاع)* | NASA OSDR | حساب تأثير الإشعاع على صحة الطاقم بناءً على معدلات الجرعات الممتصة الحقيقية في محطة الفضاء الدولية (`mSv/day`). |
| **OSDR** *(مستودع بيانات العلوم المفتوحة)* | وكالة ناسا (NASA) | صياغة تنبيهات صحة رواد الفضاء (كثافة العظام، الكتلة العضلية، المناعة) وبطاقات المعلومات العلمية القابلة للجمع. |
| **Mars Trek** | وكالة ناسا (NASA) | محاكاة بيئة موقع الهبوط في فوهة Jezero على المريخ وميكانيكا تأخير الإشارة مع الأرض. |
| **APOD & Mars Rover Photos** | وكالة ناسا (NASA) | عرض صور حقيقية للفضاء وسطح المريخ داخل بطاقات الاكتشافات وسجلات المهمة. |
| **حقيبة إنتاج الغذاء في الفضاء** | وكالة الفضاء الكندية **(CSA)** | بناء ميكانيكا الصوبة الزراعية المائية التي تربط الطاقة والإضاءة بإنتاج الغذاء والأكسجين. |

> *إخلاء مسؤولية: هذه محاكاة تعليمية مبنية باستخدام البيانات المفتوحة من وكالة ناسا (NASA) ووكالة الفضاء الكندية (CSA). وكالة ناسا لا تمنح اعتماداً رسمياً لأي جهة غير حكومية أمريكية.*

---

## ✨ Key Features | أبرز المميزات (Ages 7–12)
- **Instant Browser Play | لعب فوري عبر المتصفح:** Zero downloads, zero logins, responsive across desktop, tablet, and mobile.
- **2D Cutaway Visual Storytelling | سرد بصري بمقطع عرضي:** Animated cross-section outpost with a cartoon astronaut reacting dynamically to solar storms, oxygen levels, and room power states.
- **Accessibility & Audio | سهولة الوصول والصوتيات:** Built-in Web Speech API **Read-Aloud (🔊)** button for younger readers, contextual tooltips explaining scientific terms (*Sol, Solar Flare, Absorbed Dose, Hydroponics*), and synthesized Web Audio sound effects.
- **Collectible Science Cards | بطاقات علوم ناسا القابلة للجمع:** Unlockable cards revealing real NASA space biology and dosimetry facts after surviving each Sol.

---

## 🛠️ Tech Stack | التقنيات والأدوات المستخدمة
- **Frontend:** React.js, Tailwind CSS, Lucide Icons, Custom SVG/CSS Animations
- **APIs:** NASA Open APIs (`DONKI`, `APOD`, `Mars Rover Photos`) with automatic offline fallback
- **Audio & Accessibility:** Web Audio API / Tone.js synthesizer, Web Speech API (`speechSynthesis`), HTML5 Print/Canvas Certificate Export

---

## 👨‍💻 Development Team | فريق التطوير
- **Lead Developers | المطورون الأساسيون:** Mohamed Moataz (محمد معتز) & Jana Mohamed (جنى محمد)
- **Mission Questions, Science Content & Co-Developers | مطورو الأسئلة والمحتوى العلمي:** Nada Ahmed (ندى أحمد), Radwa (رضوى), and Hisham (هشام)

