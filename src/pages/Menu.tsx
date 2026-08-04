import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react"
import { ForkKnife, Cookie, Coffee, Egg, Wine, TeaBag, Drop, Carrot } from "@phosphor-icons/react"
import { Coffee as LucideCoffee, Leaf, Flame, Beef, Wheat, Nut, X, Plus, Info, ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslation, Trans } from "react-i18next"

type MenuItem = {
  name: string
  description: string
  price: string
  image?: string
  tag?: string
  macros?: {
    calories: number
    protein: string
    carbs: string
    fat: string
  }
}

type MenuCategory = {
  id: string
  label: string
  icon: React.ReactNode
  items: MenuItem[]
}

type MenuGroup = {
  id: "food" | "drinks"
  label: string
  icon: React.ReactNode
  categories: MenuCategory[]
}

const menuData: MenuGroup[] = [
  {
    id: "food",
    label: "Mâncare",
    icon: <ForkKnife size={20} />,
    categories: [
      {
        id: "breakfast-soups",
        label: "Mic Dejun & Supe",
        icon: <Egg size={18} />,
        items: [
          {
            name: "Omletă Franțuzească",
            description: "2 ouă bio gătite clasic franțuzesc, moi și cremoase, servite cu pâine artizanală de secară cu semințe.",
            price: "33 lei",
            image: "https://images.pexels.com/photos/23996321/pexels-photo-23996321.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 325, protein: "18g", carbs: "27g", fat: "16g" }
          },
          {
            name: "Omletă cu Ciuperci",
            description: "Omletă din ouă bio cu ciuperci sauté, ierburi aromate și brânză topită.",
            price: "36 lei",
            image: "https://images.pexels.com/photos/26161037/pexels-photo-26161037.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 375, protein: "24g", carbs: "6g", fat: "28g" }
          },
          {
            name: "Omletă cu Avocado și Halloumi",
            description: "Omletă din ouă bio cu felii de avocado cremos și halloumi gratinat, garnisită cu ierburi proaspete.",
            price: "41 lei",
            image: "https://images.pexels.com/photos/5836624/pexels-photo-5836624.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 480, protein: "26g", carbs: "9g", fat: "38g" }
          },
          {
            name: "Avocado Toast cu Ou Poșat",
            description: "Pâine artizanală cu maia, avocado cremos, ou bio poșat, fulgi de chilli și semințe active.",
            price: "39 lei",
            image: "https://images.pexels.com/photos/4557722/pexels-photo-4557722.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            tag: "Firesc",
            macros: { calories: 469, protein: "24.5g", carbs: "34.7g", fat: "25.9g" }
          },
          {
            name: "Supă Cremă de Dovleac cu Trufe",
            description: "Supă catifelată de dovleac copt, aromatizată cu un strop de ulei de trufe și semințe crocante.",
            price: "28 lei",
            image: "https://images.pexels.com/photos/9124024/pexels-photo-9124024.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 220, protein: "4g", carbs: "24g", fat: "12g" }
          },
        ],
      },
      {
        id: "mains-salads",
        label: "Mâncăruri & Salate",
        icon: <Leaf size={20} className="text-brand-green-700" />,
        items: [
          {
            name: "Piept de Pui cu Orzo și Sos Gochujang",
            description: "Piept de pui suculent gătit lent la cuptor cu paste orzo fine și sos coreean gochujang roșu.",
            price: "52 lei",
            image: "https://images.pexels.com/photos/27777833/pexels-photo-27777833.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 600, protein: "48g", carbs: "65g", fat: "16g" }
          },
          {
            name: "Somon cu Orez și Salată Caldă de Legume",
            description: "File de somon premium la cuptor, însoțit de orez brun sălbatic și mix de legume proaspete de sezon.",
            price: "65 lei",
            image: "https://images.pexels.com/photos/31146493/pexels-photo-31146493.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 600, protein: "42g", carbs: "62g", fat: "20g" }
          },
          {
            name: "Noodles cu Vită Alive",
            description: "200g noodles integrali din grâu de munte cu fâșii fine de vițel marinat, legume asiatice crocante și sos consistent umami.",
            price: "55 lei",
            image: "https://images.pexels.com/photos/10692546/pexels-photo-10692546.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 500, protein: "32g", carbs: "58g", fat: "16g" }
          },
          {
            name: "Noodles cu Pui Alive",
            description: "200g noodles integrali din grâu de munte cu piept de pui fin crescut la sol, legume crude rântălite și sosul tău preferat.",
            price: "48 lei",
            image: "https://images.pexels.com/photos/24243345/pexels-photo-24243345.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 460, protein: "34g", carbs: "58g", fat: "10g" }
          },
          {
            name: "Halloumi Garden",
            description: "380g salată verde mixtă cu felii de halloumi rumenit la grătar, semințe active și vinegretă mediteraneană.",
            price: "55 lei",
            image: "https://images.pexels.com/photos/5950480/pexels-photo-5950480.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 515, protein: "24g", carbs: "19g", fat: "38g" }
          },
          {
            name: "Salată Caesar",
            description: "Salată clasică Caesar pregătită cu parmezan maturat, crutoane cu semințe de secară și dressing de casă.",
            price: "41 / 49 lei",
            image: "https://images.pexels.com/photos/29935339/pexels-photo-29935339.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 335, protein: "14g", carbs: "20g", fat: "22g" }
          },
          {
            name: "Salată Alive cu Pui / Somon / Vită",
            description: "O explozie de prospețime cu mix de salate verzi, proteină proaspăt friptă la cuptor la alegere și sosul tău preferat.",
            price: "49 lei",
            image: "https://images.pexels.com/photos/5192431/pexels-photo-5192431.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 501, protein: "45.6g", carbs: "28.1g", fat: "22.8g" }
          },
        ],
      },
      {
        id: "desserts",
        label: "Deserturi fără Zahăr",
        icon: <Cookie size={20} />,
        items: [
          {
            name: "Budincă de Chia",
            description: "Semințe ecologice de chia lăsate la hidratat în lapte cremos de migdale, servite sub un jeleu catifelat de mango și fructe roșii.",
            price: "28 lei",
            image: "https://images.pexels.com/photos/5947029/pexels-photo-5947029.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 260, protein: "8g", carbs: "26g", fat: "14g" }
          },
          {
            name: "Terci de Ovăz cu Fructe Roșii",
            description: "Fulgi integrali dospiți în lapte fierbinte de cocos, miere parfumată de tei și un decor generos cu fructe proaspete de pădure.",
            price: "28 lei",
            image: "https://images.pexels.com/photos/6082910/pexels-photo-6082910.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 290, protein: "8g", carbs: "42g", fat: "10g" }
          },
          {
            name: "Carrot Cake",
            description: "Prăjitură moale aromată cu morcov, nucă românească ruptă, fulgi de cocos și scorțișoară exotică mărunțită.",
            price: "24 lei",
            image: "https://images.pexels.com/photos/5594497/pexels-photo-5594497.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            tag: "Must Try",
            macros: { calories: 360, protein: "5g", carbs: "45g", fat: "18g" }
          },
          {
            name: "Raspberry Cheesecake with Oat Crumble",
            description: "Desert echilibrat cu bază crocantă din biscuiți de ovăz, cremă spumată fină de brânză și dulceață artizanală de zmeură de munte.",
            price: "24 lei",
            image: "https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 320, protein: "6g", carbs: "30g", fat: "20g" }
          },
          {
            name: "Cranberries Walnut Banana Bread",
            description: "Pâine moale și densă din piure fin de banane bine coapte cu adaos delicios de merișoare acrișoare și miez crocant de nucă.",
            price: "21 lei",
            image: "https://images.pexels.com/photos/5419316/pexels-photo-5419316.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 350, protein: "6g", carbs: "50g", fat: "14g" }
          },
          {
            name: "Cocoa Peanut Butter Banana Bread",
            description: "Pâine moale din banane coapte energizantă cu inserții bogate de cacao organică pură și unt moale cald de arahide.",
            price: "16 lei",
            image: "https://images.pexels.com/photos/4384242/pexels-photo-4384242.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 350, protein: "7g", carbs: "45g", fat: "16g" }
          },
          {
            name: "Banana Bread",
            description: "Rețetă tradițională dospită delicios din piure cald natural de banane, unt bio topit și o textură pufoasă unică.",
            price: "15 lei",
            image: "https://images.pexels.com/photos/7167845/pexels-photo-7167845.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 290, protein: "5g", carbs: "44g", fat: "10g" }
          },
          {
            name: "Arahide Coapte Aromatizate",
            description: "Arahide simple în coajă coapte lent pe plită, presărate cu sare marină fină și un praf de mentă parfumată.",
            price: "12 lei",
            image: "https://images.pexels.com/photos/34142354/pexels-photo-34142354.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 315, protein: "13g", carbs: "9g", fat: "25g" }
          },
          {
            name: "Quiche Proteic cu Brânză, Pesto și Roșii",
            description: "Mini-turtă proteică dospită cu făină integrală, umplută consistent cu brânză proaspătă, pesto de busuioc, roșii cherry și smântână.",
            price: "24 lei",
            image: "https://images.pexels.com/photos/20182342/pexels-photo-20182342.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 221, protein: "10g", carbs: "12.2g", fat: "15.6g" }
          },
          {
            name: "Quiche Proteic cu Prosciutto și Roșii",
            description: "Mini-turtă proteică delicioasă dospită cu făină integrală, prosciutto crudo feliat subțire, roșii și smântână.",
            price: "27 lei",
            image: "https://images.pexels.com/photos/31882545/pexels-photo-31882545.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 245, protein: "12g", carbs: "14g", fat: "16g" }
          },
        ],
      },
    ],
  },
  {
    id: "drinks",
    label: "Băuturi",
    icon: <Coffee size={20} />,
    categories: [
      {
        id: "coffee-functional",
        label: "Cafea & Funcționale",
        icon: <LucideCoffee size={18} className="text-brand-green-700" />,
        items: [
          {
            name: "Espresso",
            description: "Espresso robust intens scurt, extras dintr-un blend select de specialitate.",
            price: "12 lei",
            image: "https://images.pexels.com/photos/12039010/pexels-photo-12039010.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Espresso Doppio",
            description: "Shot dublu lung și energizant de espresso aromat de specialitate.",
            price: "14 lei",
            image: "https://images.pexels.com/photos/1047168/pexels-photo-1047168.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Americano",
            description: "O extracție clasică echilibrată de espresso alungită fin cu apă caldă.",
            price: "12 lei",
            image: "https://images.pexels.com/photos/11429424/pexels-photo-11429424.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Long Black",
            description: "Espresso dublu turnat direct peste apă caldă, menținând crema densă.",
            price: "15 lei",
            image: "https://images.pexels.com/photos/6027998/pexels-photo-6027998.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Flat White",
            description: "Espresso dublu de origine și o emulsie caldă de lapte organic de ovăz.",
            price: "18 lei",
            image: "https://images.pexels.com/photos/894696/pexels-photo-894696.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Cappuccino",
            description: "Espresso bio asortat cu spumă fină, caldă și catifelată de lapte cremos.",
            price: "18 lei",
            image: "https://images.pexels.com/photos/22221952/pexels-photo-22221952.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Latte",
            description: "Espresso cu mult lapte cremos și puțină spumă mătăsoasă.",
            price: "18 lei",
            image: "https://images.pexels.com/photos/459489/pexels-photo-459489.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Cold Brew",
            description: "Cafea aromată extrasă lent timp de 12 ore la rece, plină de prospețime.",
            price: "17 lei",
            image: "https://images.pexels.com/photos/37022847/pexels-photo-37022847.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Cold Brew Tonic",
            description: "Blend de Cold Brew și apă tonică cu cuburi de gheață.",
            price: "18 lei",
            image: "https://images.pexels.com/photos/3165336/pexels-photo-3165336.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Protein Shake Peanut Chocolate",
            description: "Mix de proteină vegetală vegană (31g) cu arahide crocante, cacao pură și banană.",
            price: "25 lei",
            tag: "High Protein",
            image: "https://images.pexels.com/photos/4378601/pexels-photo-4378601.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 290, protein: "31g", carbs: "22g", fat: "8g" }
          },
          {
            name: "Protein Shake Blue Vanilla",
            description: "Proteină vegană fină de vanilie combinate excelent cu spirulină albastră și lapte vegetal.",
            price: "25 lei",
            tag: "High Protein",
            image: "https://images.pexels.com/photos/5337014/pexels-photo-5337014.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 270, protein: "25g", carbs: "20g", fat: "6g" }
          },
          {
            name: "Matcha Protein",
            description: "Pudră de matcha de ceremonie bio preparată cu colagen, miere și lapte vegetal.",
            price: "25 lei",
            image: "https://images.pexels.com/photos/12389352/pexels-photo-12389352.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 240, protein: "20g", carbs: "18g", fat: "4g" }
          },
          {
            name: "Collagen Mango Lemonade",
            description: "Limonadă exotică revigorantă combinată savuros cu piure de mango și colagen marin premium.",
            price: "28 lei",
            tag: "Beauty Tonic",
            image: "https://images.pexels.com/photos/4955264/pexels-photo-4955264.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 140, protein: "10g", carbs: "22g", fat: "0g" }
          },
          {
            name: "Electrolyte Orange Drink",
            description: "Băutură de recuperare cu portocale stors, lămâie, sâmburi, electroliți naturali și miere.",
            price: "28 lei",
            image: "https://images.pexels.com/photos/14510445/pexels-photo-14510445.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 95, protein: "1g", carbs: "24g", fat: "0g" }
          },
          {
            name: "Creatine Lemonade",
            description: "Limonadă sportivă revigorantă cu creatină monohidrat, mentă zdrobită și miere bio.",
            price: "23 lei",
            tag: "Energy",
            image: "https://images.pexels.com/photos/5668215/pexels-photo-5668215.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 110, protein: "0g", carbs: "28g", fat: "0g" }
          },
          {
            name: "Bloody Roots",
            description: "Blend antioxidant complex obținut din sfeclă roșie de toamnă, morcovi și ghimbir proaspăt.",
            price: "23 lei",
            image: "https://images.pexels.com/photos/4443478/pexels-photo-4443478.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 120, protein: "2g", carbs: "26g", fat: "0g" }
          },
        ],
      },
      {
        id: "teas",
        label: "Ceaiuri & Infuzii",
        icon: <TeaBag size={18} />,
        items: [
          {
            name: "Matcha Latte",
            description: "Matcha ceremonială japoneză dospită mătăsos cu lapte bio cald de ovăz.",
            price: "25 lei",
            image: "https://images.pexels.com/photos/911810/pexels-photo-911810.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 140, protein: "3g", carbs: "15g", fat: "3g" }
          },
          {
            name: "Iced Matcha Latte",
            description: "Matcha de ceremonie turnată rece peste gheață zdrobită și emulsie de ovăz.",
            price: "25 lei",
            image: "https://images.pexels.com/photos/38345070/pexels-photo-38345070.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 130, protein: "3g", carbs: "14g", fat: "2.5g" }
          },
          {
            name: "Matcha Tonic",
            description: "Băutură aromată tonică revigorantă combinată savuros cu matcha ceremonială.",
            price: "20 lei",
            image: "https://images.pexels.com/photos/38345070/pexels-photo-38345070.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 85, protein: "1g", carbs: "20g", fat: "0g" }
          },
          {
            name: "Ceai Mango / Summer Love",
            description: "Infuzie pură aromatică din fructe tropicale dulci sau blend floral aromat dospit la rece.",
            price: "18 lei",
            image: "https://images.pexels.com/photos/723129/pexels-photo-723129.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
            macros: { calories: 5, protein: "0g", carbs: "1g", fat: "0g" }
          },
        ],
      },
      {
        id: "soft-drinks",
        label: "Răcoritoare",
        icon: <Drop size={18} />,
        items: [
          {
            name: "Apă Plată Aqua Carpatica",
            description: "Apă plată pură de izvor de munte Aqua Carpatica, îmbuteliată la sticlă mică (330ml).",
            price: "8.5 lei",
            image: "https://images.pexels.com/photos/1128207/pexels-photo-1128207.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Apă Plată Aqua Carpatica Mare",
            description: "Apă plată curată de izvor montan Aqua Carpatica, la sticlă mare pentru hidratare (750ml).",
            price: "12.5 lei",
            image: "https://images.pexels.com/photos/31107362/pexels-photo-31107362.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Apă Minerală Aqua Carpatica",
            description: "Apă minerală natural carbogazoasă de izvor Aqua Carpatica (330ml).",
            price: "8.5 lei",
            image: "https://images.pexels.com/photos/12987477/pexels-photo-12987477.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Apă Minerală Aqua Carpatica Mare",
            description: "Apă minerală carbogazoasă bogată în săruri minerale, la sticlă mare (750ml).",
            price: "15.5 lei",
            image: "https://images.pexels.com/photos/327090/pexels-photo-327090.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Apă de Cocos Coconat Sparkling",
            description: "Apă carbogazoasă naturală hidratantă extrasă direct din nucă ecologică de cocos (520ml).",
            price: "15.5 lei",
            image: "https://images.pexels.com/photos/32831497/pexels-photo-32831497.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Apă de Cocos Coconat Classic",
            description: "Apă de cocos naturală bogată în electroliți simpli activi (330ml).",
            price: "15.5 lei",
            image: "https://images.pexels.com/photos/32831497/pexels-photo-32831497.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
        ],
      },
      {
        id: "non-alcoholic",
        label: "Mocktails & Sucuri",
        icon: <Carrot size={18} />,
        items: [
          {
            name: "Fresh Portocale / Grapefruit / Mix",
            description: "Suc 100% natural, preparat pe loc la storcător din citrice proaspete.",
            price: "23 lei",
            image: "https://images.pexels.com/photos/14510445/pexels-photo-14510445.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Feel Green",
            description: "Smoothie ecologic complex preparat din portocale proaspete, banane dulci și spanac fin baby.",
            price: "23 lei",
            tag: "Detox",
            image: "https://images.pexels.com/photos/11896097/pexels-photo-11896097.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Energy Boost",
            description: "Băutură naturală din portocale stors, ghimbir tăiat, mere și mango zemos.",
            price: "23 lei",
            tag: "Energy",
            image: "https://images.pexels.com/photos/4443460/pexels-photo-4443460.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Iced Mango Summer Love",
            description: "Smoothie cald decorat răcoritor cu piure de mango bio dospit și cuburi de gheață.",
            price: "25 lei",
            image: "https://images.pexels.com/photos/17612822/pexels-photo-17612822.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Limonadă",
            description: "Limonadă acrișoară scurtă realizată din lămâi proaspete și sirop curat de agave.",
            price: "19 lei",
            image: "https://images.pexels.com/photos/7360957/pexels-photo-7360957.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Limonadă cu Mentă",
            description: "Băutură clasică aromată cu suc ecologic de lămâie, frunze de mentă asortate și miere bio.",
            price: "23 lei",
            image: "https://images.pexels.com/photos/18142599/pexels-photo-18142599.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Limonadă Ghimbir și Mango",
            description: "Limonadă fină deosebită asortată savuros cu spumă de ghimbir iute de munte și suc de mango.",
            price: "25 lei",
            image: "https://images.pexels.com/photos/8173456/pexels-photo-8173456.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Iced Tea Mango",
            description: "Infuzie răcoritoare fină spumată cu ulei de mango tropical din belșug.",
            price: "23 lei",
            image: "https://images.pexels.com/photos/33573200/pexels-photo-33573200.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Iced Tea Summer Love",
            description: "Infuzie răcoritoare florală organică servită din cuburi mari cristalizate de gheață.",
            price: "23 lei",
            image: "https://images.pexels.com/photos/34567239/pexels-photo-34567239.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Socată",
            description: "Socată clasică românească fermentată excelent din flori aromate proaspete.",
            price: "23 lei",
            image: "https://images.pexels.com/photos/38345781/pexels-photo-38345781.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Socată Colorată",
            description: "Socată fină colorată natural prin infuzii secrete din flori sălbatice (520ml).",
            price: "18.5 lei",
            image: "https://images.pexels.com/photos/10279308/pexels-photo-10279308.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
        ],
      },
      {
        id: "alcoholic",
        label: "Vinuri & Bere",
        icon: <Wine size={18} />,
        items: [
          {
            name: "OneTwо Bnszwei – German Lager 5% ABV",
            description: "400ml de bere artizanală blondă curată lager, dospită fin și proaspăt trasă la draft.",
            price: "20 lei",
            tag: "Craft",
            image: "https://images.pexels.com/photos/6570266/pexels-photo-6570266.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "OneTwо Juicy – Hazy IPA 5.5% ABV",
            description: "400ml bere artizanală fructată nefiltrată Hazy IPA cu arome superbe din hamei exotic.",
            price: "22 lei",
            tag: "Craft",
            image: "https://images.pexels.com/photos/1267681/pexels-photo-1267681.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "OneTwо Mango Habanero",
            description: "400ml de bere artizanală rară, infuzată aromat cu mango dulce și fructat cu ardei picant Habanero.",
            price: "23 lei",
            tag: "Craft",
            image: "https://images.pexels.com/photos/33315800/pexels-photo-33315800.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Prosecco Bends Rosé",
            description: "Prosecco rosé elegant, bio, plin de rotunjime și efervescență fină (sticlă sau pahar).",
            price: "100 / 28 lei",
            image: "https://images.pexels.com/photos/30206424/pexels-photo-30206424.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Vin Petru Vaselo Alb",
            description: "Vin alb proaspăt aromatic adus direct de la renumita cramă locală bio.",
            price: "100 / 28 lei",
            image: "https://images.pexels.com/photos/5895443/pexels-photo-5895443.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Vin Petru Vaselo Roze",
            description: "Vin roze sec și elegant cu arome mătăsoase de fructe roșii dospite la soare.",
            price: "100 / 28 lei",
            image: "https://images.pexels.com/photos/15186519/pexels-photo-15186519.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Vin Petru Vaselo Roșu",
            description: "Vin roșu catifelat cu tanini fini adus direct de la crama locală.",
            price: "100 / 28 lei",
            image: "https://images.pexels.com/photos/31011781/pexels-photo-31011781.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Vin Iliaș Fetească Albă",
            description: "Vin alb premium asortat corect din soiuri pur românești (sticlă de 75cl).",
            price: "110 lei",
            image: "https://images.pexels.com/photos/19284897/pexels-photo-19284897.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Vin Petru Vaselo Malvine Alb",
            description: "Cupaj bio aromatic alb premium pur de la crama Petru Vaselo (75cl).",
            price: "110 lei",
            image: "https://images.pexels.com/photos/13037311/pexels-photo-13037311.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Aperol Spritz",
            description: "Aperol combinat clasic cu prosseco rece, apă minerală și portocale (180ml).",
            price: "35 / 26 lei",
            image: "https://images.pexels.com/photos/27668709/pexels-photo-27668709.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Hugo",
            description: "Prosecco cu sirop de soc aromat, mentă dulce și sâmburi striviți (180ml).",
            price: "30 lei",
            image: "https://images.pexels.com/photos/639146/pexels-photo-639146.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Vin Iliaș Pinot Noir Roze",
            description: "Pahar elegant premium dintr-un selecționat Pinot Noir Rosé fin (150ml).",
            price: "30 lei",
            image: "https://images.pexels.com/photos/30206422/pexels-photo-30206422.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Vin Petru Vaselo Maltine Alb",
            description: "Pahar de vin alb curat de specialitate de top (150ml).",
            price: "30 lei",
            image: "https://images.pexels.com/photos/10403547/pexels-photo-10403547.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
          {
            name: "Wine Cooler",
            description: "Vin răcoritor bio cu fructe roșii și sifon clasic (200ml).",
            price: "30 lei",
            image: "https://images.pexels.com/photos/3619268/pexels-photo-3619268.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
          },
        ],
      },
    ],
  },
]

const tagColors: Record<string, string> = {
  "Wellness Boost": "bg-brand-green-100 text-brand-green-800 font-bold",
  Signature: "bg-brand-green-700 text-brand-cream-50 font-bold",
  Echilibru: "bg-brand-green-100 text-brand-green-800 font-bold",
  Firesc: "bg-brand-green-100 text-brand-green-800 font-bold",
  "Must Try": "bg-red-100 text-red-800 font-bold",
  "Beauty Tonic": "bg-pink-100 text-pink-800 font-bold",
  Recovery: "bg-blue-100 text-blue-800 font-bold",
  Energy: "bg-amber-100 text-amber-800 font-bold",
  Detox: "bg-brand-green-100 text-brand-green-800 font-bold",
  Relaxare: "bg-purple-100 text-purple-800 font-bold",
  Probiotic: "bg-teal-100 text-teal-800 font-bold",
  Hidratare: "bg-blue-100 text-blue-800 font-bold",
  Craft: "bg-amber-100 text-amber-800 font-bold",
  Brunch: "bg-orange-100 text-orange-800 font-bold",
}

function CategoryBar({
  categories,
  activeCategory,
  onSelect,
  compact,
}: {
  categories: MenuCategory[]
  activeCategory: string
  onSelect: (id: string) => void
  compact: boolean
}) {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const updateArrows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    updateArrows()
    window.addEventListener("resize", updateArrows)
    return () => window.removeEventListener("resize", updateArrows)
  }, [updateArrows, categories])

  const scrollByAmount = (dir: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: dir * 260, behavior: "smooth" })
  }

  return (
    <div className="relative w-full mb-10 bg-brand-cream-200/60 border-y border-brand-green-700/10 shadow-inner shadow-brand-green-700/5">
      <div
        ref={scrollRef}
        onScroll={updateArrows}
        className={`flex gap-2.5 overflow-x-auto px-6 md:px-10 scroll-pl-6 md:scroll-pl-10 scroll-pr-6 md:scroll-pr-10 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-[padding] duration-300 ease-out ${compact ? "py-1.5" : "py-3"}`}
      >
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={(e) => {
              onSelect(cat.id)
              e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" })
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap flex-shrink-0 snap-start transition-all duration-200 font-sans ${
              activeCategory === cat.id
                ? "bg-brand-green-700 text-brand-cream-50 shadow-md shadow-brand-green-700/15"
                : "border border-brand-green-700/10 text-brand-green-700/80 bg-brand-cream-50/70 hover:border-brand-green-700/30 hover:text-brand-green-700 hover:bg-brand-cream-50"
            }`}
          >
            {cat.icon}
            {t(`menu.categories.${cat.id}`)}
          </button>
        ))}
      </div>

      {/* Left fade + arrow: shown when there are hidden items to the left */}
      <AnimatePresence>
        {canLeft && (
          <motion.button
            type="button"
            onClick={() => scrollByAmount(-1)}
            aria-label="Derulează la stânga"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-y-0 left-0 flex items-center pl-3 pr-10 bg-gradient-to-r from-brand-cream-200 via-brand-cream-200/90 to-transparent"
          >
            <span className="w-9 h-9 rounded-full bg-brand-cream-50 border border-brand-green-700/15 shadow-sm flex items-center justify-center text-brand-green-700">
              <ChevronLeft className="w-4 h-4" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Right fade + arrow: shown when there are hidden items to the right */}
      <AnimatePresence>
        {canRight && (
          <motion.button
            type="button"
            onClick={() => scrollByAmount(1)}
            aria-label="Derulează la dreapta"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-y-0 right-0 flex items-center justify-end pr-3 pl-10 bg-gradient-to-l from-brand-cream-200 via-brand-cream-200/90 to-transparent"
          >
            <span className="w-9 h-9 rounded-full bg-brand-cream-50 border border-brand-green-700/15 shadow-sm flex items-center justify-center text-brand-green-700">
              <ChevronRight className="w-4 h-4" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Menu() {
  const { t } = useTranslation()
  const [activeGroup, setActiveGroup] = useState<MenuGroup["id"]>("food")
  const [activeCategory, setActiveCategory] = useState(menuData[0].categories[0].id)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)

  // Whether the sticky menu nav has collapsed into its compact state.
  // Driven by a simple scroll threshold (with hysteresis) instead of a per-frame value so the
  // transition is animated smoothly by CSS rather than re-rendering on every scroll frame.
  const navSentinelRef = useRef<HTMLDivElement>(null)
  const stickyNavRef = useRef<HTMLDivElement>(null)
  const listAnchorRef = useRef<HTMLDivElement>(null)
  const [navCompact, setNavCompact] = useState(false)

  useEffect(() => {
    const NAV_OFFSET = 64 // sticky top offset — tucks the bar flush beneath the fixed header
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const el = navSentinelRef.current
        if (!el) return
        const top = el.getBoundingClientRect().top
        // Hysteresis: collapse a bit after the stick point, expand a bit before it,
        // so tiny scroll jitters near the threshold don't cause flickering.
        setNavCompact((prev) => (prev ? top < NAV_OFFSET + 24 : top < NAV_OFFSET - 8))
      })
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  const activeGroupObj = menuData.find((g) => g.id === activeGroup)!
  const activeCategoryObj =
    activeGroupObj.categories.find((c) => c.id === activeCategory) ?? activeGroupObj.categories[0]

  const handleGroupChange = (groupId: MenuGroup["id"]) => {
    if (groupId === activeGroup) return
    const group = menuData.find((g) => g.id === groupId)!
    setActiveGroup(groupId)
    setActiveCategory(group.categories[0].id)
  }

  // When the visible list changes (group or category), scroll up so the first product of the
  // new list sits just below the sticky nav. Skips the very first render so the page doesn't
  // jump on mount.
  const firstListRender = useRef(true)
  useEffect(() => {
    if (firstListRender.current) {
      firstListRender.current = false
      return
    }
    const anchor = listAnchorRef.current
    if (!anchor) return
    const STICKY_OFFSET = 64 // matches the sticky nav's top offset
    const navHeight = stickyNavRef.current?.offsetHeight ?? 0
    const target =
      anchor.getBoundingClientRect().top + window.scrollY - STICKY_OFFSET - navHeight - 12
    window.scrollTo({ top: Math.max(0, target), behavior: "smooth" })
  }, [activeCategory, activeGroup])

  return (
    <section id="menu" className="min-h-screen py-24 px-6 bg-brand-cream-100 overflow-x-clip">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <p className="text-brand-green-700 uppercase tracking-[0.3em] text-xs font-bold mb-3 font-sans">{t("menu.tagline")}</p>
          <h2 className="text-4xl md:text-6xl font-extrabold text-brand-green-700 tracking-tight font-serif lowercase">
            <Trans
              i18nKey="menu.title"
              components={{ 1: <span className="text-brand-green-500 font-sans" /> }}
            >
              Meniul Nostru<span className="text-brand-green-500 font-sans">.</span>
            </Trans>
          </h2>
          <p className="text-brand-dark/80 text-sm mt-3 max-w-xl mx-auto font-light leading-relaxed font-sans">
            {t("menu.desc")}
          </p>
        </motion.div>

        {/* Sentinel: marks where the nav becomes sticky so we can measure scroll progress */}
        <div ref={navSentinelRef} aria-hidden className="h-0" />

        {/* Sticky menu navigation: both the Food/Drinks toggle and the category chips
            stick to the top together and progressively shrink the gap between them on scroll.
            Full-bleed via margin (no transform) so it doesn't jitter while scrolling, and a
            fully opaque background so no content shows through. It tucks flush beneath the
            fixed header, leaving no transparent strip. */}
        <div ref={stickyNavRef} className="sticky top-16 z-30 w-screen ml-[calc(50%-50vw)] bg-brand-cream-100">
          {/* Group toggle (Food / Drinks) */}
          <div
            className="max-w-4xl mx-auto px-6 flex justify-center transition-[padding,margin] duration-300 ease-out"
            style={{
              paddingTop: navCompact ? 16 : 22,
              marginBottom: navCompact ? 2 : 28,
            }}
          >
            <div
              className="inline-flex p-1.5 rounded-full bg-brand-cream-200/60 border border-brand-green-700/10 origin-top transition-transform duration-300 ease-out"
              style={{ transform: navCompact ? "scale(0.88)" : "scale(1)" }}
            >
              {menuData.map((group) => (
                <button
                  key={group.id}
                  onClick={() => handleGroupChange(group.id)}
                  className={`flex items-center gap-2 px-7 py-2.5 rounded-full text-sm font-bold transition-all duration-200 font-sans ${
                    activeGroup === group.id
                      ? "bg-brand-green-700 text-brand-cream-50 shadow-md shadow-brand-green-700/20"
                      : "text-brand-green-700/70 hover:text-brand-green-700"
                  }`}
                >
                  {group.icon}
                  {t(`menu.categories.${group.id}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Category chips — full-width bar with dynamic scroll arrows */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeGroup}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <CategoryBar
                categories={activeGroupObj.categories}
                activeCategory={activeCategory}
                onSelect={setActiveCategory}
                compact={navCompact}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Anchor marking the top of the product list (scroll target on list change) */}
        <div ref={listAnchorRef} aria-hidden className="h-0" />

        {/* Menu Items */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {activeCategoryObj.items.map((item, i) => (
              <motion.button
                type="button"
                onClick={() => setSelectedItem(item)}
                key={item.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.07 }}
                className="text-left w-full cursor-pointer flex flex-col overflow-hidden rounded-2xl border border-brand-green-700/10 bg-brand-cream-50 hover:bg-white hover:shadow-lg hover:border-brand-green-700/25 transition-all duration-300 group"
              >
                {item.image && (
                  <div className="relative w-full aspect-[4/3] overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {item.tag && (
                      <span className={`absolute top-3 left-3 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm ${tagColors[item.tag] ?? "bg-brand-cream-200 text-brand-dark/60"}`}>
                        {item.tag}
                      </span>
                    )}
                    {/* Click-for-details hint, revealed on hover */}
                    <span className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-cream-50/90 backdrop-blur text-brand-green-700 text-[11px] font-bold shadow-sm opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                      <Plus className="w-3.5 h-3.5" /> {t("menu.details")}
                    </span>
                  </div>
                )}

                <div className="flex flex-col flex-1 p-4 md:p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-brand-dark font-bold group-hover:text-brand-green-700 transition-colors text-sm sm:text-base font-serif lowercase leading-tight">{item.name}</h3>
                    <span className="text-brand-green-700 font-bold text-xs sm:text-sm whitespace-nowrap">{item.price}</span>
                  </div>

                  {/* Macronutrients & Calories badges */}
                  {item.macros && (
                    <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                      <span className="px-2.5 py-1 rounded bg-brand-green-700/10 text-brand-green-700 font-bold flex items-center gap-1.5 border border-brand-green-700/10">
                        <Flame className="w-3.5 h-3.5" /> {item.macros.calories} {t("menu.macros.calories")}
                      </span>
                      <span className="px-2.5 py-1 rounded bg-brand-cream-200/50 text-brand-dark/80 font-medium flex items-center gap-1.5 border border-brand-green-700/5" title={t("menu.macros.protein")}>
                        <Beef className="w-3.5 h-3.5 text-red-700/80" /> {item.macros.protein} {t("menu.macros.protein")}
                      </span>
                      <span className="px-2.5 py-1 rounded bg-brand-cream-200/50 text-brand-dark/80 font-medium flex items-center gap-1.5 border border-brand-green-700/5" title={t("menu.macros.carbs")}>
                        <Wheat className="w-3.5 h-3.5 text-amber-700/80" /> {item.macros.carbs} {t("menu.macros.carbs")}
                      </span>
                      <span className="px-2.5 py-1 rounded bg-brand-cream-200/50 text-brand-dark/80 font-medium flex items-center gap-1.5 border border-brand-green-700/5" title={t("menu.macros.fat")}>
                        <Nut className="w-3.5 h-3.5 text-amber-700" /> {item.macros.fat} {t("menu.macros.fat")}
                      </span>
                    </div>
                  )}

                  {/* Suggestion that a click opens the full description */}
                  <p className="mt-auto pt-3 flex items-center gap-1.5 text-brand-green-700/70 group-hover:text-brand-green-700 text-[11px] sm:text-xs font-semibold font-sans transition-colors">
                    <Info className="w-3.5 h-3.5" /> {t("menu.clickHint")}
                  </p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Coffee section teaser */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-16 p-6 rounded-2xl border border-brand-green-700/15 bg-brand-cream-200/50 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left"
        >
          <div className="w-12 h-12 rounded-full bg-brand-green-700/10 flex items-center justify-center flex-shrink-0 text-brand-green-700">
            <LucideCoffee size={24} />
          </div>
          <div>
            <p className="text-brand-green-700 font-bold text-base font-serif lowercase">{t("menu.teaserTitle")}</p>
            <p className="text-brand-dark/70 text-xs md:text-sm font-light mt-1 font-sans">{t("menu.teaserDesc")}</p>
          </div>
        </motion.div>
      </div>

      {/* Item detail modal */}
      <AnimatePresence>
        {selectedItem && (
          <Dialog static open={!!selectedItem} onClose={() => setSelectedItem(null)} className="relative z-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-brand-dark/50 backdrop-blur-sm"
              aria-hidden="true"
            />
            <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6">
              <DialogPanel className="relative w-full max-w-lg">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 24 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="relative w-full max-h-[90vh] overflow-y-auto rounded-3xl bg-brand-cream-50 shadow-2xl shadow-brand-dark/30"
              >
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  aria-label={t("menu.close")}
                  className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-brand-cream-50/90 backdrop-blur text-brand-dark/70 hover:text-brand-green-700 border border-brand-green-700/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {selectedItem.image && (
                  <div className="w-full h-56 sm:h-64 overflow-hidden">
                    <img src={selectedItem.image} alt={selectedItem.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="p-6 sm:p-8">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <DialogTitle className="text-2xl sm:text-3xl font-extrabold text-brand-green-700 font-serif lowercase leading-tight">
                      {selectedItem.name}
                    </DialogTitle>
                    <span className="text-brand-green-700 font-bold text-base whitespace-nowrap mt-1">{selectedItem.price}</span>
                  </div>

                  {selectedItem.tag && (
                    <span className={`inline-block text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider mb-4 ${tagColors[selectedItem.tag] ?? "bg-brand-cream-200 text-brand-dark/60"}`}>
                      {selectedItem.tag}
                    </span>
                  )}

                  <p className="text-brand-dark/70 text-sm sm:text-base leading-relaxed font-light font-sans mb-6">{selectedItem.description}</p>

                  {selectedItem.macros && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="flex flex-col items-center justify-center text-center p-3 rounded-xl bg-brand-green-700/10 border border-brand-green-700/10">
                        <Flame className="w-5 h-5 text-brand-green-700 mb-1" />
                        <span className="text-brand-green-700 font-bold text-sm">{selectedItem.macros.calories} {t("menu.macros.calories")}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center text-center p-3 rounded-xl bg-brand-cream-200/50 border border-brand-green-700/5">
                        <Beef className="w-5 h-5 text-red-700/80 mb-1" />
                        <span className="text-brand-dark/80 font-semibold text-sm">{selectedItem.macros.protein}</span>
                        <span className="text-brand-dark/50 text-[11px] font-medium">{t("menu.macros.protein")}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center text-center p-3 rounded-xl bg-brand-cream-200/50 border border-brand-green-700/5">
                        <Wheat className="w-5 h-5 text-amber-700/80 mb-1" />
                        <span className="text-brand-dark/80 font-semibold text-sm">{selectedItem.macros.carbs}</span>
                        <span className="text-brand-dark/50 text-[11px] font-medium">{t("menu.macros.carbs")}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center text-center p-3 rounded-xl bg-brand-cream-200/50 border border-brand-green-700/5">
                        <Nut className="w-5 h-5 text-amber-700 mb-1" />
                        <span className="text-brand-dark/80 font-semibold text-sm">{selectedItem.macros.fat}</span>
                        <span className="text-brand-dark/50 text-[11px] font-medium">{t("menu.macros.fat")}</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
              </DialogPanel>
            </div>
          </Dialog>
        )}
      </AnimatePresence>
    </section>
  )
}
