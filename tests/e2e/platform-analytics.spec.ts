import { expect, test, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const response = {
  period: { key: "7d", from: 0, to: 1 },
  overview: { players: 12, started: 24, completed: 18, abandoned: 6, wins: 10, losses: 8, completionRate: 75, winRate: 55.6 },
  modes: ["FREE_PLAY", "DAILY", "EVENT"].map((mode, index) => ({ mode, started: 8, completed: 6, completionRate: 75, players: 4 + index })),
  games: ["quiz-biblico","wordle-biblico","linha-do-tempo-biblica","memoria-biblica","associacao-de-temas","quem-sou-eu","jogo-tres-pistas"].map(gameType => ({ gameType, started: 3, players: 2, completed: 2, abandoned: 1, wins: 1, completionRate: 66.7, winRate: 50, difficulties:[{difficulty:"EASY",sample:12,completionRate:75,sufficientSample:true}],topContent:[{uses:4}],leastUsedContent:[{uses:1}] })),
  daily: { started: 7, completed: 5, wins: 3, completed3: 2, completed7: 1, funnel:{stages:[{name:"opened",users:8,conversionFromPrevious:null,abandonmentFromPrevious:null},{name:"started",users:7,conversionFromPrevious:87.5,abandonmentFromPrevious:1},{name:"completed3",users:2,conversionFromPrevious:28.6,abandonmentFromPrevious:5},{name:"completed7",users:1,conversionFromPrevious:50,abandonmentFromPrevious:1}]} },
  events: { participants: 4, games: 5, completed: 3, wins: 2, funnel:{stages:[{name:"participated",users:4},{name:"started",users:4,conversionFromPrevious:100,abandonmentFromPrevious:0},{name:"progressed",users:3,conversionFromPrevious:75,abandonmentFromPrevious:1}]}, items:[{eventId:"event-1",title:"Semana Bíblica",participants:4,sessions:5,games:2,completed:3,xpRewarded:20,coinsRewarded:4}] },
  content: ["quiz-biblico","wordle-biblico","linha-do-tempo-biblica","memoria-biblica","associacao-de-temas","quem-sou-eu","jogo-tres-pistas"].map(gameType => ({ gameType, published: 20, available: 12, reservedEvent: 2, usedContent: 5, neverUsed: 7, exhaustionRisk: false })),
  retention: { newUsers: 3, returningUsers: 7, returnRate:70, averageStreak: 2.4 },
  economy: { xpGranted: 500, coinsGranted: 80, coinsSpent: 35, netCoins:45, purchases: 4, aggregateBalance: 240,freePlayCap:{reachedUsers:2},rewardOrigins:[{asset:"coins",source:"game_finished_free_play",entries:10,amount:30}] },
  comparisons:Object.fromEntries(["activeUsers","started","completed","dailyOpened","returningUsers","xpGranted","netCoins"].map(key=>[key,{current:10,previous:8,difference:2,percentChange:25}])),
  trends:[{day:"2026-08-10",activeUsers:8,started:12,completed:9}],
  definitions:{organizationTimeZone:"America/Sao_Paulo",difficultyMinimumSample:10},
};
const json=(route:Route,body:unknown,status=200)=>route.fulfill({status,contentType:"application/json",body:JSON.stringify(body)});

test("Analytics administrativo apresenta estado agregado responsivo e troca de período",async({page})=>{
 await page.route("**/api/auth/me",route=>json(route,{user:{id:"admin",displayName:"Admin",role:"admin",permissions:[]}}));
 await page.route("**/api/admin/platform-analytics**",route=>json(route,response));
 await page.goto("/admin/analytics");
 await expect(page.getByRole("heading",{name:/Uso do Conte os Feitos/i})).toBeVisible();
 await expect(page.getByText("Jogadores ativos")).toBeVisible();
 await expect(page.getByRole("heading",{name:"Tendências"})).toBeVisible();
 await expect(page.getByText("Marco 7/7")).toBeVisible();
 await expect(page.getByText("Amostra insuficiente")).toHaveCount(0);
 await expect(page.getByRole("row",{name:/Wordle/i})).toBeVisible();
 await page.getByRole("button",{name:"30 dias"}).click();
 await expect(page.getByRole("button",{name:"30 dias"})).toHaveAttribute("aria-pressed","true");
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 expect(overflow).toBe(0);
 await expect(page.locator("body")).not.toContainText(/@|correctAnswer|payload_json/);
 const audit=await new AxeBuilder({page}).include("main").analyze();
 expect(audit.violations.filter(item=>["critical","serious"].includes(item.impact||""))).toEqual([]);
});

test("falha de Analytics mostra erro seguro com supportId",async({page})=>{
 await page.route("**/api/auth/me",route=>json(route,{user:{id:"viewer",displayName:"Viewer",role:"participant",permissions:["analytics.view"]}}));
 await page.route("**/api/admin/platform-analytics**",route=>json(route,{error:"analytics_read_failed",message:"Ocorreu um erro inesperado.",supportId:"SUP-safe"},500));
 await page.goto("/admin/analytics");
 await expect(page.locator("section[role='alert']")).toContainText("SUP-safe");
 await expect(page.getByRole("button",{name:"Tentar novamente"})).toBeVisible();
});
