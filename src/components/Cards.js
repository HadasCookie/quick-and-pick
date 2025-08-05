import React from "react";
import CardItem from "./CardItem";
import "./Cards.css";

function Cards() {
  return (
    <div className="cards">
      <h1>!תגלו את הפיצ'רים החדישים ביותר שלנו</h1>
      <div className="cards__container">
        <div className="cards__wrapper">
          <ul className="cards__items">
            <CardItem
              src="images/find-sopping-list.jpg"
              text="מציאת סל הקניות הזול ביותר"
              path="/Address"
            />
            <CardItem
              src="images/AI (2).jpg"
              text=" יצירה של סל קניות מותאם אישית "
              path="/ChatBot"
            />
          </ul>
          <ul className="cards__items">
            <CardItem
              src="images/recipetolist.jpg"
              text="יצירת סל קניות ממתכון"
              path="/CreateList"
            />
            <CardItem
              src="images/profile.jpg"
              text="פרופיל מותאם אישית"
              path="/MyProfile"
            />
            <CardItem
              src="images/nontification.jpg"
              text="קבלת עדכונים בלייב על שינוי מחירים"
              path="/sign-up"
            />
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Cards;
