import { expect, test, type Route } from "@playwright/test";

const response = {
  period: { key: "7d", from: 0, to: 1 },
  overview: { players: 12, started: 24, completed: 18, abandoned: 6, wins: 10, losses: 8, completionRate: 75, winRate: 55.6 },
  modes: ["FREE_PLAY", "DAILY", "EVENT"].map((mode, index) => ({ mode, started: 8, completed: 6, completionRate: 75, players: 4 + index })),
  games: ["quiz-biblico","wordle-biblico","linha-do-tempo-biblica","memoria-biblica","associacao-de-temas","quem-sou-eu","jogo-tres-pistas"].map(gameType => ({ gameType, started: 3, players: 2, completed: 2, abandoned: 1, wins: 1, completionRate: 66.7, winRate: 50 })),
  daily: { started: 7, completed: 5, wins: 3, completed3: 2, completed7: 1 },
  events: { participants: 4, games: 5, completed: 3, wins: 2 },
  content: ["quiz-biblico","wordle-biblico","linha-do-tempo-biblica","memoria-biblica","associacao-de-temas","quem-sou-eu","jogo-tres-pistas"].map(gameType => ({ gameType, published: 20, available: 12, reservedEvent: 2, usedContent: 5, neverUsed: 7, exhaustionRisk: false })),
  retention: { newUsers: 3, returningUsers: 7, averageStreak: 2.4 },
  economy: { xpGranted: 500, coinsGranted: 80, coinsSpent: 35, purchases: 4, aggregateBalance: 240 },
};
const json=(route:Route,body:unknown,status=200)=>route.fulfill({status,contentType:"application/json",body:JSON.stringify(body)});

test("Analytics administrativo apresenta estado agregado responsivo e troca de período",async({page})=>{
 await page.route("**/api/auth/me",route=>json(route,{user:{id:"admin",displayName:"Admin",role:"admin",permissions:[]}}));
 await page.route("**/api/admin/platform-analytics**",route=>json(route,response));
 await page.goto("/admin/analytics");
 await expect(page.getByRole("heading",{name:/Uso do Conte os Feitos/i})).toBeVisible();
 await expect(page.getByText("Jogadores ativos")).toBeVisible();
 await expect(page.getByRole("row",{name:/Wordle/i})).toBeVisible();
 await page.getByRole("button",{name:"30 dias"}).click();
 await expect(page.getByRole("button",{name:"30 dias"})).toHaveAttribute("aria-pressed","true");
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 expect(overflow).toBe(0);
 await expect(page.locator("body")).not.toContainText(/@|correctAnswer|payload_json/);
});

test("falha de Analytics mostra erro seguro com supportId",async({page})=>{
 await page.route("**/api/auth/me",route=>json(route,{user:{id:"viewer",displayName:"Viewer",role:"participant",permissions:["analytics.view"]}}));
 await page.route("**/api/admin/platform-analytics**",route=>json(route,{error:"analytics_read_failed",message:"Ocorreu um erro inesperado.",supportId:"SUP-safe"},500));
 await page.goto("/admin/analytics");
 await expect(page.locator("section[role='alert']")).toContainText("SUP-safe");
 await expect(page.getByRole("button",{name:"Tentar novamente"})).toBeVisible();
});
