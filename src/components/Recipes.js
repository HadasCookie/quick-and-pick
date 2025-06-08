import React, { useRef, useEffect, useState } from "react";
import styles from "./Recipes.module.css";

const recipes = [
  {
    name: "עוגת גבינה ללא סוכר",
    image: "/images/noSuger.jpg",
    text: `200 גרם שקדים טחונים
80 גרם חמאה
3 גבינה לבנה 5%
3 ביצים
2 כפיות תמצית וניל
כפית קליפת לימון מגורדת
2 כפות סוויטאנגו תחליף סוכר
2 יחידות שמנת חמוצה 15%`,
  },
  {
    name: "פשטידה עמוסת חלבון",
    image: "/images/pashtida1.jpg",
    text: `2 כוסות ברוקולי מבושל
  גביע יוגורט 0% שומן
  30 גרם גבינת מוצרלה
  כף אבקת מרק
יחידה ביצה 1
  כף גדושה קמח
  2 פרוסות לחם מלא
  1/2 כפית מלח
כפית פלפל שחור 1/2
 1 כף בזיליקום`,
  },

  {
    name: "סופגניות טבעוניות",
    image: "/images/sufgi.jpg",
    text: `500 גרם (3 כוסות וחצי) קמח
  10 גרם שמרים יבשים או 30 גרם שמרים טריים
  65 גרם (שליש כוס) סוכר
  שני שליש כפית מלח
  50 גרם (רבע כוס) שמן
  1 כפית תמצית וניל
  1-2 כפות ברנדי או רום
  280 מ"ל (כוס ועוד 3 כפות) חלב סויה, חמים
  1 יחידות שמן קנולה
  כוס ריבת תות
  כוס אבקת סוכר`,
  },
  {
    name: "רוזלך לוטוס",
    image: "/images/rozalah.jpg",
    text: `3 כוסות (420 גרם) קמח לחם או קמח לבן
  1 כפית (5 גרם) שמרים יבשים
  רבע כפית מלח
  4 כפות שמן קנולה
  ממרח לוטוס
  כוס אבקת סוכר`,
  },
  {
    name: "פיצה ללא גלוטן",
    image: "/images/pizza.jpg",
    text: `2 כוסות קמח נטול גלוטן
  1/3 כוס קמח אורז
  1 כפית גדושה אבקת אפייה
  1 ביצה
  2 כפות שמן זית
  1/2 גביע יוגורט (100 מ”ל)
  1/2 כפית מלח
  כוס רוטב לפיצה
  יחידה גבינת מוצרלה
  כוס בזיליקום`,
  },
  {
    name: "נודלס מוקפץ בסיר אחד",
    image: "/images/10min.jpg",
    text: `חבילת נודלס
  400 גרם חזה עוף
  3 גזרים
  1 בצל סגול
  7 פטריות
  גמבה 
  חצי כרוב
  3 שיני שום כתוש
  כף ג'ינג'ר
  כף שמן שומשום
  רבע כוס סויה בהירה
  רבע כוס טריאקי
  4 כפות צ'ילי מתוק`,
  },
  {
    name: "סלט קיסר משודרג",
    image: "/images/salad.jpg",
    text: `2 חסה לליק
  30 גרם גבינת פרמזן מגוררת
  40 גרם גבינת פרמזן
  200 גרם לחם מלא
  1/2 כפית מלח
  3-4 כפות שמן זית
  1 ביצה
  1 כף חרדל גרגרים
  1/2 שן שום
  1/2 חבילת אנשובי
  1-2 כפות מיץ לימון
  1-2 כפיות חומץ
  2 כפות רוטב סויה
  1 כוס שמן קנולה
  1/2 כפית טבסקו`,
  },

  // ... add more!
];

const DUP_FACTOR = 200; // How many times to repeat the cards for infinity effect

const Recipes = ({ onRecipeSelect }) => {
  const containerRef = useRef();
  const [speed, setSpeed] = useState(1); // px per frame
  const [dir, setDir] = useState(1); // 1 = right, -1 = left
  const [offset, setOffset] = useState(0);

  // Mouse controls direction & speed
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const { left, width } = containerRef.current.getBoundingClientRect();
      const x = e.clientX - left;
      const middle = width / 2;
      // Direction: right of center = 1, left = -1
      const direction = x > middle ? 1 : -1;
      // Speed: further from center = faster (max 4, min 0.5)
      const rel = Math.abs(x - middle) / middle;
      setSpeed(0.5 + rel * 3.5);
      setDir(direction);
    };
    const ref = containerRef.current;
    if (ref) {
      ref.addEventListener("mousemove", handleMouseMove);
      ref.addEventListener("mouseleave", () => setSpeed(1));
    }
    return () => {
      if (ref) {
        ref.removeEventListener("mousemove", handleMouseMove);
        ref.removeEventListener("mouseleave", () => setSpeed(1));
      }
    };
  }, []);

  // Animation loop
  useEffect(() => {
    let running = true;
    let last = performance.now();
    function tick(now) {
      if (!running) return;
      const dt = Math.min(now - last, 32); // ms
      last = now;
      setOffset((old) => {
        let newOffset = old + dir * speed;
        // Reset when too far
        const totalWidth = recipes.length * DUP_FACTOR * 300; // 200px card + 40px gap
        if (newOffset > totalWidth / 2) return newOffset - totalWidth / 2;
        if (newOffset < -totalWidth / 2) return newOffset + totalWidth / 2;
        return newOffset;
      });
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return () => {
      running = false;
    };
  }, [dir, speed]);

  // Repeat the recipes for infinite scroll effect
  const visibleRecipes = [];
  for (let i = 0; i < DUP_FACTOR; ++i) visibleRecipes.push(...recipes);

  return (
    <div
      className={styles.carouselContainer}
      ref={containerRef}
      style={{ margin: "40px 0" }}
    >
      <div
        className={styles.carouselTrack}
        style={{
          transform: `translateX(${-offset}px)`,
        }}
      >
        {visibleRecipes.map((rec, idx) => (
          <div
            key={idx}
            className={styles.recipeCard}
            onClick={() => onRecipeSelect && onRecipeSelect(rec.text)}
          >
            <img src={rec.image} alt={rec.name} className={styles.recipeImg} />
            <div className={styles.recipeName}>{rec.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Recipes;
