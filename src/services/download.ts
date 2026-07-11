export function downloadText(name:string,text:string) {
  const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}))
  const link=document.createElement('a')
  link.href=url
  link.download=name
  link.click()
  URL.revokeObjectURL(url)
}
