import { useState,useEffect } from "react";
import axios from 'axios'
import cors from 'cors';



function Register(){
    const [formData,SetFormData] = useState({
        username:'',
        email:'',
        password:''
    })
    const handleChange = (e)=>{
        const {name,value} = e.target;
        SetFormData({...formData,[name]:value})
        console.log(formData);
    }

    const handleReg=()=>{
        const res = axios.post(`http://localhost:3000/auth/register`,formData,{headers:{
            'Content-Type':'application/json'
        }}).then(res=>{
            const cookie_token = res.data.token;
        });

    }

return (
    <>
        <label htmlFor="Username">Username:</label>
        <input onChange={(e)=>{handleChange(e)}} name="username" type="text" placeholder="username"/>
        <label htmlFor="Email">Email:</label>
        <input onChange={(e)=>{handleChange(e)}} name="email" type="text" placeholder="enter your email"/>
        <label htmlFor="Password">Password:</label>
        <input onChange={(e)=>{handleChange(e)}} name="password" type="password" placeholder="enter your password"/>
        <button onClick={handleReg}>Submit</button>
    </>
)
}

export default Register; 