import { useState,useEffect } from "react";
import axios from 'axios'

function Register(){
    const [formData,SetFormData] = useState({
        email:'',
        password:''
    })
    const handleChange = (e)=>{
        const {name,value} = e.target;
        SetFormData({...formData,[name]:value})
        console.log(formData);
    }

    const handleLogin=()=>{
        const res = axios.post(`http://localhost:3000/auth/login`,formData,{headers:{
            'Content-Type':'application/json'
        },withCredentials:true}).then(res=>console.log(res.data.message));
    }

return (
    <>
        <label htmlFor="Email">Email:</label>
        <input onChange={(e)=>{handleChange(e)}} name="email" type="text" placeholder="enter your email"/>
        <label htmlFor="Password">Password:</label>
        <input onChange={(e)=>{handleChange(e)}} name="password" type="password" placeholder="enter your password"/>
        <button onClick={handleLogin}>Submit</button>
    </>
)
}

export default Register; 