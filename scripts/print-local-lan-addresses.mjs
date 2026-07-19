import { networkInterfaces } from "node:os";

const port = 8788;
const isPrivateIpv4 = (address) => {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  return (
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
};
const addresses = Object.values(networkInterfaces())
  .flatMap(entries => entries || [])
  .filter(entry => entry.family === "IPv4" && !entry.internal && isPrivateIpv4(entry.address))
  .map(entry => entry.address)
  .filter((address, index, all) => all.indexOf(address) === index);

console.log("\nAmbiente LAN local protegido. Abra no celular conectado à mesma rede Wi-Fi:");
if (addresses.length === 0) {
  console.log(`  Nenhum IPv4 de rede foi detectado. Consulte ipconfig e use http://SEU-IP:${port}`);
} else {
  for (const address of addresses) console.log(`  http://${address}:${port}`);
}
console.log("\nUsuário: adminlocal");
console.log("Senha: TesteLocal2026!");
console.log("Para encerrar, pressione Ctrl+C. Nenhum túnel ou recurso remoto será iniciado.\n");
