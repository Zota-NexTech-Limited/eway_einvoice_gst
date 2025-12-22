export  function generateResponse (status:boolean, message:String, code:Number,  data:any){
	var response = {
		status : status,
		message : message,
		code : code,
		data : data
	}
	return (response);
}