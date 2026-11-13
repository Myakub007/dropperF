import { useEffect, useState } from "react";
import axios from 'axios';
import chunkFileBrowser from "./scripts/chunker";
import hashChunkBrowser from "./scripts/hasher";

async function fetchFileTree(setFileTree) {
  const getTree = await axios.get('http://localhost:3000/tree', { withCredentials: true });
  // console.log(getTree.data.tree);
  setFileTree(getTree.data.tree);
}

function handleDocumentId(id){
  console.log(id);
}

function TreeNode({ node }) {
  if(node.children?.length===0){
    return (<div>No files</div>)
  }
  return (<div style={{ marginLeft: "20px", borderLeft: node.type === "folder" ? "" : "1px solid" }}>
    <div style={{ fontWeight: node.type === "folder" ? "300" : "800", display: "flex", alignItems: "center", gap: "6px", boxSizing: "border-box", marginLeft: node.type === "file" ? "10px" : "" }} >{node.type === "folder" ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" color="currentColor" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M8 7H16.75C18.8567 7 19.91 7 20.6667 7.50559C20.9943 7.72447 21.2755 8.00572 21.4944 8.33329C22 9.08996 22 10.1433 22 12.25C22 15.7612 22 17.5167 21.1573 18.7779C20.7926 19.3238 20.3238 19.7926 19.7779 20.1573C18.5167 21 16.7612 21 13.25 21H12C7.28595 21 4.92893 21 3.46447 19.5355C2 18.0711 2 15.714 2 11V7.94427C2 6.1278 2 5.21956 2.38032 4.53806C2.65142 4.05227 3.05227 3.65142 3.53806 3.38032C4.21956 3 5.1278 3 6.94427 3C8.10802 3 8.6899 3 9.19926 3.19101C10.3622 3.62712 10.8418 4.68358 11.3666 5.73313L12 7"></path>
    </svg> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" color="currentColor" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 7L16 7"></path>
      <path d="M8 11L12 11"></path>
      <path d="M13 21.5V21C13 18.1716 13 16.7574 13.8787 15.8787C14.7574 15 16.1716 15 19 15H19.5M20 13.3431V10C20 6.22876 20 4.34315 18.8284 3.17157C17.6569 2 15.7712 2 12 2C8.22877 2 6.34315 2 5.17157 3.17157C4 4.34314 4 6.22876 4 10L4 14.5442C4 17.7892 4 19.4117 4.88607 20.5107C5.06508 20.7327 5.26731 20.9349 5.48933 21.1139C6.58831 22 8.21082 22 11.4558 22C12.1614 22 12.5141 22 12.8372 21.886C12.9044 21.8623 12.9702 21.835 13.0345 21.8043C13.3436 21.6564 13.593 21.407 14.0919 20.9081L18.8284 16.1716C19.4065 15.5935 19.6955 15.3045 19.8478 14.9369C20 14.5694 20 14.1606 20 13.3431Z"></path>
    </svg>}{node.name} {node.type==="file"?<button onClick={()=>{handleDocumentId(node.id)}}>Download</button>:<div></div>}</div>
    {node.children?.map((child) => {
      return(
          <TreeNode key={child.name} node={child} />
      )
    })}
  </div>)
}

function FileBrowser() {
  const [fileTree, setFileTree] = useState({name:"/",type:"folder",children:[]});
  const [file, setFile] = useState(null);
  const [hashes, setHashes] = useState([]);
  const [preview, setPreview] = useState(null);

  const handleFileSelection = async (e) => {
    e.preventDefault()
    let newFile = e.target.files[0];
    if(!newFile) return;
    setFile(newFile);

    let generateUrl = URL.createObjectURL(newFile);
    setPreview(generateUrl);

  }

  const handleUpload = async () =>{
    
    const size = file.size;
    const chunkIterator = chunkFileBrowser(file);
    const totalChunks = Math.ceil(size/(4*1024*1024));

    // setHashes([]);
    const Uploadedhashes=[];

    try{
      for await (const chunkBuffer of chunkIterator){
        let hash = await hashChunkBrowser(chunkBuffer);
        // Upload logic here
        // setHashes((prevHashes=>[...prevHashes,hash])); not working due to async state
        Uploadedhashes.push(hash);
        setHashes(Uploadedhashes);
        try{
          await axios.get(`http://localhost:3000/chunks/${hash}`,{withCredentials:true});
          console.log("chunk already exists")
        }catch(err){
          if(err.response?.status === 404){
            try{
              const uploadMessage = await axios.post(`http://localhost:3000/chunks/${hash}`,chunkBuffer,{headers:{
                "Content-Type":"application/octet-stream"
              },withCredentials:true})
              console.log(uploadMessage.data.message);
            }catch(err){
              console.log(err.message);
            }
          }else{
            console.log(err.message);
          }
        }
      }
      const iext = file.name.lastIndexOf('.')+1
      const path = `${file.name.slice(iext).toLowerCase()}'s/${file.name}`;
      // console.log(path,file.name,file)
      console.log(Uploadedhashes);
      axios.post(`http://localhost:3000/files`,{path:path,hashes:Uploadedhashes},{withCredentials:true}).then(res=>{console.log(res)});
      await fetchFileTree(setFileTree)
    }catch(err){
      console.log(err.message);
    }
  }
  useEffect(()=>{
    fetchFileTree(setFileTree);
  },[])

  useEffect(()=>{
    console.log(hashes);
  },[hashes])

  return (
    <>
      <div> Upload a file <input type="file" onChange={handleFileSelection} /></div>
      <button onClick={handleUpload}>Upload</button>
      {preview && <img src={preview} alt="image" style={{height:"100px",width:"100px"}} />}
      <div>
        <TreeNode node={fileTree} />
      </div>
    </>
  )
}
export default FileBrowser;